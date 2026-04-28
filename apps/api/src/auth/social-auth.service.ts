// eslint-disable import/namespace -- the firebase-admin CJS namespace import
// confuses eslint-plugin-import; runtime members (apps, initializeApp, auth,
// credential) are present and used correctly.
/* eslint-disable import/namespace */
import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as admin from 'firebase-admin';
import { OAuth2Client } from 'google-auth-library';

import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

interface SocialProfile {
  provider: string;
  providerAccountId: string;
  email?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  phone?: string;
}

@Injectable()
export class SocialAuthService {
  private readonly logger = new Logger(SocialAuthService.name);
  private readonly googleClient: OAuth2Client;
  private readonly googleClientId: string;
  private readonly facebookAppId: string;
  private readonly facebookAppSecret: string;
  private firebaseInitialized = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID', '');
    this.googleClient = new OAuth2Client(this.googleClientId);

    this.facebookAppId = this.configService.get<string>('FACEBOOK_APP_ID', '');
    this.facebookAppSecret = this.configService.get<string>('FACEBOOK_APP_SECRET', '');

    this.initFirebase();
  }

  private initFirebase() {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID', '');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL', '');
    const privateKey = this.configService
      .get<string>('FIREBASE_PRIVATE_KEY', '')
      ?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey && !admin.apps.length) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        });
        this.firebaseInitialized = true;
        this.logger.log('Firebase Admin SDK initialized');
      } catch (error) {
        this.logger.warn('Firebase Admin SDK initialization failed — phone OTP login disabled');
        this.logger.debug(error);
      }
    }
  }

  // ──────────────────────────────────────────────────────────
  // Google Login
  // ──────────────────────────────────────────────────────────

  async googleLogin(idToken?: string, accessToken?: string) {
    let payload: any;

    if (idToken) {
      // Verify Google ID token (from GoogleLogin component / credential flow)
      try {
        const ticket = await this.googleClient.verifyIdToken({
          idToken,
          audience: this.googleClientId,
        });
        payload = ticket.getPayload();
      } catch {
        throw new UnauthorizedException('Invalid Google ID token');
      }
    } else if (accessToken) {
      // Verify Google access token (from useGoogleLogin / implicit flow)
      try {
        const res = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) {
          throw new Error('Failed to verify');
        }
        payload = await res.json();
      } catch {
        throw new UnauthorizedException('Invalid Google access token');
      }
    } else {
      throw new BadRequestException('Either idToken or accessToken is required');
    }

    if (!payload?.email) {
      throw new BadRequestException('Google account does not have an email address');
    }

    const profile: SocialProfile = {
      provider: 'GOOGLE',
      providerAccountId: payload.sub,
      email: payload.email,
      firstName: payload.given_name || payload.name?.split(' ')[0] || 'User',
      lastName: payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '',
      avatar: payload.picture,
    };

    return this.findOrCreateSocialUser(profile);
  }

  // ──────────────────────────────────────────────────────────
  // Facebook Login
  // ──────────────────────────────────────────────────────────

  async facebookLogin(accessToken: string) {
    // Verify token with Facebook debug endpoint
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${this.facebookAppId}|${this.facebookAppSecret}`;

    let debugData: any;
    try {
      const debugRes = await fetch(debugUrl);
      debugData = await debugRes.json();
    } catch {
      throw new UnauthorizedException('Failed to verify Facebook token');
    }

    if (!debugData?.data?.is_valid) {
      throw new UnauthorizedException('Invalid Facebook token');
    }

    // Fetch user profile
    const profileUrl = `https://graph.facebook.com/me?fields=id,first_name,last_name,email,picture.type(large)&access_token=${accessToken}`;

    let fbProfile: any;
    try {
      const profileRes = await fetch(profileUrl);
      fbProfile = await profileRes.json();
    } catch {
      throw new UnauthorizedException('Failed to fetch Facebook profile');
    }

    if (!fbProfile?.email) {
      throw new BadRequestException(
        'Your Facebook account does not have an email address. Please use a different login method.',
      );
    }

    const profile: SocialProfile = {
      provider: 'FACEBOOK',
      providerAccountId: fbProfile.id,
      email: fbProfile.email,
      firstName: fbProfile.first_name || 'User',
      lastName: fbProfile.last_name || '',
      avatar: fbProfile.picture?.data?.url,
    };

    return this.findOrCreateSocialUser(profile);
  }

  // ──────────────────────────────────────────────────────────
  // Firebase Login (Google / Facebook via Firebase Auth)
  //
  // The Firebase ID token tells us which provider was used via
  // `decoded.firebase.sign_in_provider` ("google.com", "facebook.com", etc.),
  // so a single endpoint handles every Firebase-backed social login.
  // ──────────────────────────────────────────────────────────

  async firebaseLogin(idToken: string) {
    if (!this.firebaseInitialized) {
      throw new BadRequestException('Firebase authentication is not configured');
    }

    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Invalid Firebase token');
    }

    const signInProvider: string = decoded.firebase?.sign_in_provider ?? 'firebase';
    const provider =
      signInProvider === 'google.com'
        ? 'GOOGLE'
        : signInProvider === 'facebook.com'
          ? 'FACEBOOK'
          : signInProvider.toUpperCase();

    if (!decoded.email) {
      throw new BadRequestException('Firebase token does not contain an email address');
    }

    const fullName = decoded.name ?? '';
    const [firstName = 'User', ...rest] = fullName.split(' ').filter(Boolean);
    const lastName = rest.join(' ');

    const profile: SocialProfile = {
      provider,
      providerAccountId: decoded.uid,
      email: decoded.email,
      firstName,
      lastName,
      avatar: decoded.picture,
    };

    return this.findOrCreateSocialUser(profile);
  }

  // ──────────────────────────────────────────────────────────
  // Phone (Firebase) Login
  // ──────────────────────────────────────────────────────────

  async phoneLogin(idToken: string) {
    if (!this.firebaseInitialized) {
      throw new BadRequestException('Phone authentication is not configured');
    }

    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Invalid Firebase token');
    }

    const phone = decoded.phone_number;
    if (!phone) {
      throw new BadRequestException('Firebase token does not contain a phone number');
    }

    const profile: SocialProfile = {
      provider: 'PHONE',
      providerAccountId: decoded.uid,
      phone,
      firstName: 'User',
      lastName: '',
    };

    return this.findOrCreatePhoneUser(profile);
  }

  // ──────────────────────────────────────────────────────────
  // Shared: find or create social user (Google / Facebook)
  // ──────────────────────────────────────────────────────────

  private async findOrCreateSocialUser(profile: SocialProfile) {
    // 1. Check if this provider account is already linked
    const existingAccount = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
        },
      },
      include: { user: true },
    });

    if (existingAccount) {
      return this.loginSocialUser(existingAccount.user);
    }

    // 2. Check if a user with the same email already exists
    if (profile.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (existingUser) {
        // Link new provider to existing user
        await this.prisma.account.create({
          data: {
            userId: existingUser.id,
            type: 'oauth',
            provider: profile.provider,
            providerAccountId: profile.providerAccountId,
          },
        });

        // Update avatar if user doesn't have one
        if (!existingUser.avatar && profile.avatar) {
          await this.prisma.user.update({
            where: { id: existingUser.id },
            data: { avatar: profile.avatar },
          });
        }

        this.logger.log(
          `Linked ${profile.provider} account to existing user: ${existingUser.email}`,
        );

        return this.loginSocialUser(existingUser);
      }
    }

    // 3. Create a brand new user + account
    const newUser = await this.prisma.user.create({
      data: {
        email: profile.email!,
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatar: profile.avatar || null,
        emailVerified: true, // Social providers verify email
        role: 'CUSTOMER',
        status: 'ACTIVE',
        accounts: {
          create: {
            type: 'oauth',
            provider: profile.provider,
            providerAccountId: profile.providerAccountId,
          },
        },
      },
    });

    this.logger.log(`New user created via ${profile.provider}: ${newUser.email}`);

    return this.loginSocialUser(newUser);
  }

  // ──────────────────────────────────────────────────────────
  // Shared: find or create phone user
  // ──────────────────────────────────────────────────────────

  private async findOrCreatePhoneUser(profile: SocialProfile) {
    // 1. Check if this Firebase UID is already linked
    const existingAccount = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
        },
      },
      include: { user: true },
    });

    if (existingAccount) {
      return this.loginSocialUser(existingAccount.user);
    }

    // 2. Check if a user with the same phone already exists
    if (profile.phone) {
      const existingUser = await this.prisma.user.findFirst({
        where: { phone: profile.phone },
      });

      if (existingUser) {
        // Link phone provider to existing user
        await this.prisma.account.create({
          data: {
            userId: existingUser.id,
            type: 'oauth',
            provider: profile.provider,
            providerAccountId: profile.providerAccountId,
          },
        });

        // Mark phone as verified
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { phoneVerified: true },
        });

        this.logger.log(`Linked phone account to existing user: ${existingUser.email}`);

        return this.loginSocialUser(existingUser);
      }
    }

    // 3. Create a brand new user with placeholder email
    const placeholderEmail = `phone_${profile.providerAccountId}@placeholder.local`;

    const newUser = await this.prisma.user.create({
      data: {
        email: placeholderEmail,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        phoneVerified: true,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        accounts: {
          create: {
            type: 'oauth',
            provider: profile.provider,
            providerAccountId: profile.providerAccountId,
          },
        },
      },
    });

    this.logger.log(`New phone user created: ${newUser.phone}`);

    return this.loginSocialUser(newUser);
  }

  // ──────────────────────────────────────────────────────────
  // Generate tokens and return login response
  // ──────────────────────────────────────────────────────────

  private async loginSocialUser(user: any) {
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Your account has been deactivated. Please contact support.');
    }

    const tokens = await this.authService.generateTokens(user.id, user.email, user.role);

    // Store hashed refresh token
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: hashedRefreshToken,
        lastLoginAt: new Date(),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }
}
