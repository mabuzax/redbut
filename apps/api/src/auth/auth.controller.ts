import {
  Controller,
  Post,
  Get,
  Body,
  HttpStatus,
  ValidationPipe,
  UsePipes,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SessionCacheService } from '../common/session-cache.service';
import { CreateAnonymousSessionDto } from './dto/create-anonymous-session.dto';
import { AnonymousSessionResponseDto } from './dto/anonymous-session-response.dto';
import { GenerateOTPDto, VerifyOTPDto, OTPGenerationResponseDto, OTPVerificationResponseDto } from './dto/otp-auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private sessionCache: SessionCacheService,
  ) {}

  @Post('anon')
  @ApiOperation({ summary: 'Create an anonymous user session' })
  @ApiBody({ type: CreateAnonymousSessionDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Anonymous session created successfully',
    type: AnonymousSessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid table number',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createAnonymousSession(
    @Body() createSessionDto: CreateAnonymousSessionDto,
  ): Promise<AnonymousSessionResponseDto> {
    const { tableNumber } = createSessionDto;
    const { user, token } = await this.authService.createAnonymousSession(tableNumber);
    
    return {
      userId: user.id,
      tableNumber: user.tableNumber,
      sessionId: user.sessionId!,
      token,
    };
  }

  /* ------------------------------------------------------------------
   *  POST /auth/otp/generate
   *  Generate and send OTP for staff authentication
   * ------------------------------------------------------------------ */

  @Post('otp/generate')
  @ApiOperation({ summary: 'Generate OTP for staff login' })
  @ApiBody({ type: GenerateOTPDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'OTP generated and sent successfully',
    type: OTPGenerationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not found or invalid user type',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async generateOTP(
    @Body() generateOTPDto: GenerateOTPDto,
  ): Promise<OTPGenerationResponseDto> {
    const { emailOrPhone, userType } = generateOTPDto;
    return this.authService.generateOTP(emailOrPhone, userType);
  }

  /* ------------------------------------------------------------------
   *  POST /auth/otp/verify
   *  Verify OTP and authenticate staff user
   * ------------------------------------------------------------------ */

  @Post('otp/verify')
  @ApiOperation({ summary: 'Verify OTP and authenticate staff user' })
  @ApiBody({ type: VerifyOTPDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'OTP verified successfully, user authenticated',
    type: OTPVerificationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid OTP or username',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async verifyOTP(
    @Body() verifyOTPDto: VerifyOTPDto,
  ): Promise<OTPVerificationResponseDto> {
    const { username, otp, userType } = verifyOTPDto;
    return this.authService.verifyOTPAndLogin(username, otp, userType);
  }

  /* ------------------------------------------------------------------
   *  GET /auth/verify
   *  Simple endpoint to validate the JWT and return user info.
   * ------------------------------------------------------------------ */

  @Get('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify JWT token and return authenticated user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token is valid; returns user info attached to the request',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing token',
  })
  verifyToken(@Req() req: any) {
    // JwtAuthGuard attaches the validated user to req.user
    return req.user;
  }

  /* ------------------------------------------------------------------
   *  POST /auth/validate-session
   *  Validate a table session and optionally update user info
   * ------------------------------------------------------------------ */

  @Post('validate-session')
  @ApiOperation({ summary: 'Validate table session and update user info' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        name: { type: 'string', nullable: true },
        clientId: { type: 'string', nullable: true, description: 'Client identifier to prevent multiple active sessions' },
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session validated and user info updated',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        sessionId: { type: 'string' },
        tableNumber: { type: 'number' },
        userId: { type: 'string' },
        name: { type: 'string' },
        waiter: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            surname: { type: 'string' },
          },
          nullable: true,
        },
        token: { type: 'string', description: 'JWT authentication token' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Table session not found. Ask Waiter to assist you.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'If you need to change tables or sessions, please ask your waiter for assistance',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        existingSession: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            tableNumber: { type: 'number' },
          },
        },
      },
    },
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async validateSession(
    @Body() dto: { sessionId: string; name?: string; clientId?: string },
  ) {
    return this.authService.validateSession(dto.sessionId, dto.name, dto.clientId);
  }
}
