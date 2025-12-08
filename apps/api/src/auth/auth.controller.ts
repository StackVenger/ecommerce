import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { FacebookAuthDto } from './dto/facebook-auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import { PhoneAuthDto } from './dto/phone-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyEmailDto, ResendVerificationDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SocialAuthService } from './social-auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly socialAuthService: SocialAuthService,
  ) {}

  /**
   * POST /auth/google
   * Authenticate with Google ID token.
   */
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() dto: GoogleAuthDto) {
    const result = await this.socialAuthService.googleLogin(dto.idToken, dto.accessToken);

    return {
      statusCode: HttpStatus.OK,
      message: 'Google login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    };
  }

  /**
   * POST /auth/facebook
   * Authenticate with Facebook access token.
   */
  @Post('facebook')
  @HttpCode(HttpStatus.OK)
  async facebookLogin(@Body() dto: FacebookAuthDto) {
    const result = await this.socialAuthService.facebookLogin(dto.accessToken);

    return {
      statusCode: HttpStatus.OK,
      message: 'Facebook login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    };
  }

  /**
   * POST /auth/phone
   * Authenticate with Firebase phone ID token.
   */
  @Post('phone')
  @HttpCode(HttpStatus.OK)
  async phoneLogin(@Body() dto: PhoneAuthDto) {
    const result = await this.socialAuthService.phoneLogin(dto.idToken);

    return {
      statusCode: HttpStatus.OK,
      message: 'Phone login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    };
  }

  /**
   * POST /auth/register
   * Register a new user account.
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Registration successful. Please verify your email address.',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    };
  }

  /**
   * POST /auth/login
   * Authenticate user with email and password.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;

    const result = await this.authService.login(dto, ipAddress);

    return {
      statusCode: HttpStatus.OK,
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        refreshExpiresIn: result.refreshExpiresIn,
      },
    };
  }

  /**
   * POST /auth/refresh
   * Refresh access and refresh tokens using a valid refresh token.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Body() dto: RefreshTokenDto) {
    const result = await this.authService.refreshTokens(dto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Tokens refreshed successfully',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    };
  }

  /**
   * POST /auth/verify-email
   * Verify a user's email address using the verification token.
   */
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    const result = await this.authService.verifyEmail(dto);

    return {
      statusCode: HttpStatus.OK,
      message: result.message,
    };
  }

  /**
   * POST /auth/resend-verification
   * Resend the email verification token.
   */
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() dto: ResendVerificationDto) {
    const result = await this.authService.resendVerification(dto);

    return {
      statusCode: HttpStatus.OK,
      message: result.message,
    };
  }

  /**
   * POST /auth/forgot-password
   * Initiate the password reset flow.
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(dto);

    return {
      statusCode: HttpStatus.OK,
      message: result.message,
    };
  }

  /**
   * POST /auth/reset-password
   * Reset the password using a valid reset token.
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(dto);

    return {
      statusCode: HttpStatus.OK,
      message: result.message,
    };
  }

  /**
   * PATCH /auth/change-password
   * Change the authenticated user's password.
   * Requires a valid JWT token.
   */
  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@Body() dto: ChangePasswordDto, @CurrentUser('id') userId: string) {
    const result = await this.authService.changePassword(userId, dto);

    return {
      statusCode: HttpStatus.OK,
      message: result.message,
    };
  }

  /**
   * POST /auth/logout
   * Logout the current user by revoking their refresh token.
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser('id') userId: string) {
    const result = await this.authService.logout(userId);

    return {
      statusCode: HttpStatus.OK,
      message: result.message,
    };
  }

  /**
   * POST /auth/logout-all
   * Logout from all devices by revoking all refresh tokens.
   */
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser('id') userId: string) {
    const result = await this.authService.logoutAll(userId);

    return {
      statusCode: HttpStatus.OK,
      message: result.message,
    };
  }

  /**
   * GET /auth/sessions
   * Get active sessions for the current user.
   */
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getSessions(@CurrentUser('id') userId: string) {
    const result = await this.authService.getSessions(userId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Sessions retrieved successfully',
      data: result,
    };
  }

  /**
   * GET /auth/me
   * Get the authenticated user's profile.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getProfile(@CurrentUser('id') userId: string) {
    const user = await this.authService.getProfile(userId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Profile retrieved successfully',
      data: user,
    };
  }

  /**
   * PATCH /auth/me
   * Update the authenticated user's profile.
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    const user = await this.authService.updateProfile(userId, dto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Profile updated successfully',
      data: user,
    };
  }
}
