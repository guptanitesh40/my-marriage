import { Body, Controller, Get, HttpCode, Ip, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiAcceptedResponse,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { Env } from '../../config/env.js';
import { ApiDataResponse } from '../../platform/response-envelope.js';
import { AllowUnverified, CurrentUser, Public } from './auth.decorators.js';
import { AuthService } from './auth.service.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { EmailVerificationService } from './email-verification.service.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { PasswordResetService } from './password-reset.service.js';
import { MeDto } from './dto/me.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { SignupDto } from './dto/signup.dto.js';
import { clearSessionCookie, readSessionCookie, setSessionCookie } from './session-cookie.js';
import type { AuthenticatedUser } from './sessions.service.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly secureCookie: boolean;

  constructor(
    private readonly auth: AuthService,
    private readonly verification: EmailVerificationService,
    private readonly passwordReset: PasswordResetService,
    config: ConfigService<Env, true>,
  ) {
    this.secureCookie = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  /**
   * Creates an account, sends the verification email and signs the new user
   * in (sets the `mm_session` cookie). Most features wait until the email is
   * verified.
   */
  @Post('signup')
  @Public()
  @HttpCode(201)
  @ApiOperation({ summary: 'Register an account with email and password' })
  @ApiDataResponse(MeDto, { status: 201 })
  async signup(
    @Body() body: SignupDto,
    @Ip() ip: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeDto> {
    const signedIn = await this.auth.signup(body, { ip }, readSessionCookie(req));
    setSessionCookie(res, signedIn.token, signedIn.expiresAt, this.secureCookie);
    return signedIn.user;
  }

  /**
   * Verifies the email address with the secret from the emailed link. Does
   * not sign anyone in. 410 TOKEN_INVALID for a link that is unknown,
   * expired or replaced by a newer one.
   */
  @Post('verify-email')
  @Public()
  @HttpCode(204)
  @ApiOperation({ summary: 'Verify an email address with a one-time token' })
  @ApiNoContentResponse({ description: 'The address is verified.' })
  async verifyEmail(@Body() body: VerifyEmailDto, @Ip() ip: string): Promise<void> {
    await this.verification.verify(body.token, { ip });
  }

  /**
   * Sends a new verification link if the address has an unverified account.
   * Always 202, whether or not it does, so it reveals nothing.
   */
  @Post('verification/resend')
  @Public()
  @HttpCode(202)
  @ApiOperation({ summary: 'Request another verification email' })
  @ApiAcceptedResponse({ description: 'If the address needs one, an email is on its way.' })
  async resendVerification(@Body() body: ResendVerificationDto, @Ip() ip: string): Promise<void> {
    await this.verification.resend(body.email, { ip });
  }

  /**
   * Signs in and sets the `mm_session` cookie. Works before the email is
   * verified (the response says whether it is). 401 INVALID_CREDENTIALS for
   * any failure; 429 after repeated failures for one email.
   */
  @Post('login')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in and create a session cookie' })
  @ApiDataResponse(MeDto)
  async login(
    @Body() body: LoginDto,
    @Ip() ip: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeDto> {
    const signedIn = await this.auth.login(body, { ip }, readSessionCookie(req));
    setSessionCookie(res, signedIn.token, signedIn.expiresAt, this.secureCookie);
    return signedIn.user;
  }

  /** Ends the current session and clears the cookie. Always 204, signed in or not. */
  @Post('logout')
  @Public()
  @HttpCode(204)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Sign out: revoke the session and clear the cookie' })
  @ApiNoContentResponse({ description: 'Signed out.' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(readSessionCookie(req));
    clearSessionCookie(res, this.secureCookie);
  }

  /**
   * Emails a password reset link if the address has an account. Always 202,
   * whether or not it does, so it reveals nothing.
   */
  @Post('password/forgot')
  @Public()
  @HttpCode(202)
  @ApiOperation({ summary: 'Request a password reset email (non-enumerating)' })
  @ApiAcceptedResponse({ description: 'If the address has an account, an email is on its way.' })
  async forgotPassword(@Body() body: ForgotPasswordDto, @Ip() ip: string): Promise<void> {
    await this.passwordReset.forgot(body.email, { ip });
  }

  /**
   * Sets a new password with the secret from the reset link, and signs the
   * account out everywhere. Does not sign anyone in. 410 TOKEN_INVALID for a
   * link that is unknown, used, expired or replaced.
   */
  @Post('password/reset')
  @Public()
  @HttpCode(204)
  @ApiOperation({ summary: 'Reset the password with a single-use token' })
  @ApiNoContentResponse({ description: 'The password is changed.' })
  async resetPassword(@Body() body: ResetPasswordDto, @Ip() ip: string): Promise<void> {
    await this.passwordReset.reset(body.token, body.password, { ip });
  }

  /** The signed-in account. 401 without a valid session. */
  @Get('me')
  @AllowUnverified()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get the current account' })
  @ApiDataResponse(MeDto)
  me(@CurrentUser() user: AuthenticatedUser): MeDto {
    return user;
  }
}
