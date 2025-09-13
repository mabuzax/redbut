import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Req,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// DTOs for Waiter Authentication

/**
 * DTO for waiter login request.
 */
class LoginDto {
  @IsNotEmpty({ message: 'Username (email) is required' })
  @IsEmail({}, { message: 'Invalid email format for username' })
  username!: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password!: string;
}

/**
 * Response DTO for successful waiter login.
 */
class LoginResponseDto {
  @IsString()
  userId!: string;

  @IsString()
  username!: string;

  @IsString()
  waiterId!: string;

  @IsString()
  name!: string;

  @IsString()
  token!: string;

  @IsString()
  requiresPasswordChange!: boolean; // Flag to indicate if password needs to be changed
}

/**
 * DTO for changing waiter password.
 */
class ChangePasswordDto {
  @IsNotEmpty({ message: 'User ID is required' })
  @IsString({ message: 'User ID must be a string' })
  userId!: string;

  @IsNotEmpty({ message: 'Old password is required' })
  @IsString({ message: 'Old password must be a string' })
  oldPassword!: string;

  @IsNotEmpty({ message: 'New password is required' })
  @IsString({ message: 'New password must be a string' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message:
      'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword!: string;

  @IsNotEmpty({ message: 'Confirm password is required' })
  @IsString({ message: 'Confirm password must be a string' })
  confirmPassword!: string;
}

@ApiTags('auth')
@Controller('auth/waiter')
export class WaiterAuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Handles waiter login.
   * If login is successful and password is '__new__pass', it signals the frontend
   * to prompt for a password change.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate a waiter and return JWT token' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Waiter authenticated successfully',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    const { username, password } = loginDto;
    try {
      // Authenticate specifically as a waiter using the unified staff login helper
      const { waiter, token } = await this.authService.staffLogin(
        username,
        password,
        'waiter',
      );

      const requiresPasswordChange = password === '__new__pass';

      return {
        userId: waiter.id, // This is the waiter's ID, used as userId in JWT
        username: waiter.email,
        waiterId: waiter.id,
        name: `${waiter.name} ${waiter.surname}`,
        token,
        requiresPasswordChange,
      };
    } catch (e) {
      throw new HttpException(
        (e as Error).message || 'Invalid credentials',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * Handles password change for waiters.
   * Requires authentication and checks if the old password is '__new__pass'
   * or if it matches the current password.
   */
  @Post('change-password')
  @UseGuards(JwtAuthGuard) // Ensure only authenticated users can change password
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change waiter password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or old password mismatch',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async changePassword(@Body() changePasswordDto: ChangePasswordDto, @Req() req: any): Promise<void> {
    const { userId, oldPassword, newPassword, confirmPassword } = changePasswordDto;

    if (newPassword !== confirmPassword) {
      throw new HttpException('New password and confirm password do not match', HttpStatus.BAD_REQUEST);
    }

    // Ensure the userId in the DTO matches the authenticated user's ID from JWT
    if (userId !== req.user.id) {
      throw new HttpException('Unauthorized: Cannot change password for another user', HttpStatus.UNAUTHORIZED);
    }

    try {
      await this.authService.changeWaiterPassword(userId, oldPassword, newPassword);
    } catch (e) {
      throw new HttpException(
        (e as Error).message || 'Failed to change password',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Refresh JWT token for sliding session (1-hour expiry with automatic renewal).
   * Validates current token and returns a new one with extended expiry.
   */
  @Post('refresh-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Refresh JWT token for sliding session',
    description: 'Validates current token and returns a new token with 1-hour expiry. Supports sliding session functionality where tokens are refreshed automatically on API usage.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'New JWT token with 1-hour expiry'
        },
        tenant: {
          type: 'object',
          description: 'Tenant information associated with the token'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Current token is invalid or expired'
  })
  async refreshToken(@Req() req: any): Promise<{ token: string; tenant: any }> {
    try {
      // Extract current token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new HttpException('Bearer token required', HttpStatus.UNAUTHORIZED);
      }

      const currentToken = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Use the generic refreshToken method from AuthService
      const result = await this.authService.refreshToken(currentToken);
      
      if (!result) {
        throw new HttpException('Unable to refresh token', HttpStatus.UNAUTHORIZED);
      }

      return result;
    } catch (e) {
      throw new HttpException(
        (e as Error).message || 'Failed to refresh token',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
