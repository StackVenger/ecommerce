import { randomBytes } from 'crypto';

import {
  Injectable,
  Logger,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyEmailDto, ResendVerificationDto } from './dto/verify-email.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshTokenSecret: string;
  private readonly refreshTokenExpiresIn: string;
  private readonly bcryptSaltRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    this.refreshTokenSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'refresh-super-secret-key-change-in-production',
    );
    this.refreshTokenExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    this.bcryptSaltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12);
  }

  /**
   * Generate access and refresh token pair for a user.
   */
  async generateTokens(userId: string, email: string, role: string, refreshExpiresIn?: string) {
    const payload = { sub: userId, email, role };
    const actualRefreshExpiresIn = refreshExpiresIn ?? this.refreshTokenExpiresIn;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.refreshTokenSecret,
        expiresIn: actualRefreshExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken, refreshExpiresIn: actualRefreshExpiresIn };
  }

  /**
   * Generate a 6-digit numeric verification code (OTP) used for email verification.
   */
  private generateVerificationOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send the verify-email template containing the 6-digit OTP. Failures are logged
   * but never thrown — registration must not fail because SMTP is misconfigured.
   */
  private async deliverVerificationEmail(to: string, name: string, otp: string): Promise<void> {
    try {
      await this.emailService.sendEmail({
        to,
        subject: 'Verify Your Email',
        template: 'verify-email',
        context: { name, code: otp, expiresIn: '24 hours' },
      });
    } catch (error) {
      const err = error as Error & { code?: string; response?: string };
      this.logger.error(
        `Verification email failed for ${to}: ${err.message} (code=${err.code ?? 'n/a'})`,
        err.stack,
      );
      throw error;
    }
  }

  // Send the password-reset link. Errors are logged but swallowed: the
  // /auth/forgot-password endpoint must return the same response regardless
  // of whether the email exists or whether SMTP succeeded — otherwise an
  // attacker can enumerate accounts by observing which addresses 500.
  private async deliverPasswordResetEmail(
    to: string,
    name: string,
    resetUrl: string,
  ): Promise<void> {
    try {
      await this.emailService.sendEmail({
        to,
        subject: 'Reset Your Password',
        template: 'password-reset',
        context: { name, resetUrl, expiresIn: '1 hour' },
      });
    } catch (error) {
      const err = error as Error & { code?: string };
      this.logger.error(
        `Password reset email failed for ${to}: ${err.message} (code=${err.code ?? 'n/a'})`,
        err.stack,
      );
    }
  }

  /**
   * Register a new user account.
   */
  async register(dto: RegisterDto) {
    const { email, password, firstName, lastName, acceptTerms } = dto;

    if (!acceptTerms) {
      throw new BadRequestException('You must accept the terms and conditions');
    }

    // Check if the email is already registered
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, this.bcryptSaltRounds);

    // Generate email verification OTP (6-digit code stored in verifyToken column)
    const verifyToken = this.generateVerificationOtp();
    const verifyTokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create the user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        verifyToken,
        verifyTokenExp,
        role: 'CUSTOMER',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Generate authentication tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Store the hashed refresh token
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    this.logger.log(`New user registered: ${user.email}`);

    await this.deliverVerificationEmail(
      user.email,
      `${user.firstName} ${user.lastName}`.trim(),
      verifyToken,
    );

    return {
      user,
      ...tokens,
    };
  }

  /**
   * Authenticate a user with email and password.
   */
  async login(dto: LoginDto, ipAddress?: string) {
    const { email, password, rememberMe } = dto;

    // Find the user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if the account is active
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Your account has been deactivated. Please contact support.');
    }

    // Social/phone users don't have a password — they must use their provider
    if (!user.password) {
      throw new UnauthorizedException(
        'This account uses social login. Please sign in with Google, Facebook, or Phone.',
      );
    }

    // Compare the password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens (extend refresh token for "remember me")
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      rememberMe ? '30d' : undefined,
    );

    // Store the hashed refresh token and update last login
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: hashedRefreshToken,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress || null,
      },
    });

    this.logger.log(`User logged in: ${user.email}`);

    // Remove password from the response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      ...tokens,
    };
  }

  /**
   * Refresh access and refresh tokens using a valid refresh token.
   * Implements token rotation for enhanced security.
   */
  async refreshTokens(dto: RefreshTokenDto) {
    const { refreshToken } = dto;

    // Verify the refresh token
    let payload: { sub: string; email: string; role: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.refreshTokenSecret,
      });
    } catch {
      throw new ForbiddenException('Invalid or expired refresh token');
    }

    // Find the user and their stored refresh token
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        emailVerified: true,
        refreshToken: true,
        createdAt: true,
      },
    });

    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Access denied - user not found or token revoked');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Account is deactivated or suspended');
    }

    // Verify the refresh token matches the stored hash (revocation check)
    const isTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!isTokenValid) {
      // Possible token reuse attack - revoke all tokens for this user
      this.logger.warn(`Potential refresh token reuse detected for user: ${user.email}`);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: null },
      });
      throw new ForbiddenException('Token has been revoked. Please login again.');
    }

    // Rotate tokens - generate a new pair
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Store the new hashed refresh token
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    this.logger.debug(`Tokens refreshed for user: ${user.email}`);

    const { refreshToken: _, ...userWithoutToken } = user;

    return {
      user: userWithoutToken,
      ...tokens,
    };
  }

  /**
   * Verify a user's email address using the verification token.
   */
  async verifyEmail(dto: VerifyEmailDto) {
    const { token } = dto;

    // Find the user with this verification token
    const user = await this.prisma.user.findFirst({
      where: {
        verifyToken: token,
        verifyTokenExp: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw new BadRequestException(
        'Invalid or expired verification token. Please request a new one.',
      );
    }

    if (user.emailVerified) {
      return { message: 'Email is already verified' };
    }

    // Mark the email as verified and clear the token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verifyToken: null,
        verifyTokenExp: null,
      },
    });

    this.logger.log(`Email verified for user: ${user.email}`);

    return { message: 'Email verified successfully' };
  }

  /**
   * Resend the email verification token.
   * Generates a new 6-digit OTP-style token for convenience.
   */
  async resendVerification(dto: ResendVerificationDto) {
    const { email } = dto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        emailVerified: true,
        verifyTokenExp: true,
      },
    });

    if (!user) {
      // Don't reveal whether the email exists for security
      return {
        message: 'If an account with this email exists, a verification email has been sent.',
      };
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const verifyToken = this.generateVerificationOtp();
    const verifyTokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verifyToken,
        verifyTokenExp,
      },
    });

    this.logger.log(`Verification email resent to: ${user.email}`);

    await this.deliverVerificationEmail(
      user.email,
      `${user.firstName} ${user.lastName}`.trim(),
      verifyToken,
    );

    return {
      message: 'If an account with this email exists, a verification email has been sent.',
    };
  }

  /**
   * Initiate the password reset flow by generating a reset token.
   * Response is intentionally vague to prevent email enumeration.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const { email } = dto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        resetTokenExp: true,
      },
    });

    // Always return success to prevent email enumeration
    const successMessage =
      'If an account with this email exists, a password reset link has been sent.';

    if (!user) {
      return { message: successMessage };
    }

    if (user.status !== 'ACTIVE') {
      return { message: successMessage };
    }

    // Rate limit: don't allow reset requests within 60 seconds
    if (
      user.resetTokenExp &&
      new Date(user.resetTokenExp).getTime() > Date.now() + 59 * 60 * 1000
    ) {
      return { message: successMessage };
    }

    // Generate a password reset token
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExp,
      },
    });

    this.logger.log(`Password reset requested for: ${user.email}`);

    const webUrl = this.configService.get<string>('WEB_URL', 'http://localhost:3000');
    const resetUrl = `${webUrl}/reset-password?token=${resetToken}`;

    await this.deliverPasswordResetEmail(
      user.email,
      `${user.firstName} ${user.lastName}`.trim(),
      resetUrl,
    );

    return { message: successMessage };
  }

  /**
   * Reset the user's password using a valid reset token.
   */
  async resetPassword(dto: ResetPasswordDto) {
    const { token, newPassword } = dto;

    // Find the user with this reset token
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExp: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        password: true,
      },
    });

    if (!user) {
      throw new BadRequestException(
        'Invalid or expired reset token. Please request a new password reset.',
      );
    }

    // Ensure the new password is different from the current one (if they have one)
    if (user.password) {
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        throw new BadRequestException('New password must be different from the current password.');
      }
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, this.bcryptSaltRounds);

    // Update the password and clear reset token, also revoke refresh token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExp: null,
        refreshToken: null, // Invalidate all existing sessions
      },
    });

    this.logger.log(`Password reset completed for: ${user.email}`);

    return {
      message: 'Password has been reset successfully. Please login with your new password.',
    };
  }

  /**
   * Change the authenticated user's password.
   * Requires the current password for verification.
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const { currentPassword, newPassword } = dto;

    // Find the user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Social/phone users without a password cannot use this flow
    if (!user.password) {
      throw new BadRequestException(
        'Your account uses social login and does not have a password set. Use the "Forgot Password" flow to create one.',
      );
    }

    // Verify the current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Ensure the new password is different from the current one
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from the current password.');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, this.bcryptSaltRounds);

    // Update the password
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    this.logger.log(`Password changed for user: ${user.email}`);

    return { message: 'Password changed successfully' };
  }

  /**
   * Logout the current user by revoking their refresh token.
   */
  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    this.logger.log(`User logged out: ${userId}`);

    return { message: 'Logged out successfully' };
  }

  /**
   * Logout from all devices by revoking all refresh tokens.
   * This effectively invalidates all sessions for the user.
   */
  async logoutAll(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    this.logger.log(`All sessions revoked for user: ${user?.email}`);

    return { message: 'Logged out from all devices successfully' };
  }

  /**
   * Get active sessions for the current user.
   * Returns session metadata including last login info.
   */
  async getSessions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        lastLoginAt: true,
        lastLoginIp: true,
        refreshToken: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Build session information from available data
    const sessions = [];

    if (user.refreshToken) {
      sessions.push({
        id: user.id,
        active: true,
        lastLoginAt: user.lastLoginAt,
        lastLoginIp: user.lastLoginIp,
        createdAt: user.createdAt,
        current: true, // Since we use single refresh token, this is always the current session
      });
    }

    return {
      sessions,
      totalSessions: sessions.length,
    };
  }

  /**
   * Get the authenticated user's profile.
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        dateOfBirth: true,
        gender: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update the authenticated user's profile.
   * Only allows updating non-sensitive fields.
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Build update data from DTO, filtering out undefined values
    const updateData: Record<string, any> = {};

    if (dto.firstName !== undefined) {
      updateData.firstName = dto.firstName;
    }
    if (dto.lastName !== undefined) {
      updateData.lastName = dto.lastName;
    }
    if (dto.phone !== undefined) {
      updateData.phone = dto.phone;
    }
    if (dto.avatar !== undefined) {
      updateData.avatar = dto.avatar;
    }
    if (dto.dateOfBirth !== undefined) {
      updateData.dateOfBirth = new Date(dto.dateOfBirth);
    }
    if (dto.gender !== undefined) {
      updateData.gender = dto.gender;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        dateOfBirth: true,
        gender: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Profile updated for user: ${updatedUser.email}`);

    return updatedUser;
  }

  /**
   * Permanently delete the authenticated user's account. The Prisma schema
   * cascade-deletes most owned rows (accounts, addresses, carts, wishlists,
   * notifications, audit logs); orders are preserved with userId set to null
   * (Order.userId is nullable). Reviews have a non-nullable userId without
   * a cascade rule, so we delete them explicitly inside a transaction.
   */
  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, password: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Password-backed accounts must confirm their current password before
    // deletion. Social-only accounts (no password) skip this — possessing
    // a valid JWT for the user is the proof of identity.
    if (user.password) {
      if (!dto.password) {
        throw new BadRequestException('Password is required to delete this account');
      }
      const ok = await bcrypt.compare(dto.password, user.password);
      if (!ok) {
        throw new UnauthorizedException('Incorrect password');
      }
    }

    await this.prisma.$transaction([
      this.prisma.review.deleteMany({ where: { userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);

    this.logger.log(`Account deleted: ${user.email}`);
  }
}
