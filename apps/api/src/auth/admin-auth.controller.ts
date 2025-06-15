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

// DTOs for Admin Authentication

/**
 * DTO for admin login request.
 */
class AdminLoginDto {
  @IsNotEmpty({ message: 'Username (email) is required' })
  @IsEmail({}, { message: 'Invalid email format for username' })
  username!: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password!: string;
}

/**
 * Response DTO for successful admin login.
 */
class AdminLoginResponseDto {
  @IsString()
  userId!: string;

  @IsString()
  username!: string;

  @IsString()
  name!: string;

  @IsString()
  token!: string;

  @IsString()
  requiresPasswordChange!: boolean; // Flag to indicate if password needs to be changed
}

/**
 * DTO for changing admin password.
 */
class AdminChangePasswordDto {
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
@Controller('auth/admin')
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Handles admin login.
   * If login is successful and password is '__new__pass', it signals the frontend
   * to prompt for a password change.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate an admin and return JWT token' })
  @ApiBody({ type: AdminLoginDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Admin authenticated successfully',
    type: AdminLoginResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async login(@Body() loginDto: AdminLoginDto): Promise<AdminLoginResponseDto> {
    const { username, password } = loginDto;
    try {
      // Use staffLogin with userType='admin' to ensure only admin users can log in
      const { waiter, token } = await this.authService.staffLogin(username, password, 'admin');

      const requiresPasswordChange = password === '__new__pass';

      return {
        userId: waiter.id,
        username: waiter.email,
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
   * Handles password change for admins.
   * Requires authentication and checks if the old password is '__new__pass'
   * or if it matches the current password.
   */
  @Post('change-password')
  @UseGuards(JwtAuthGuard) // Ensure only authenticated users can change password
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change admin password' })
  @ApiBody({ type: AdminChangePasswordDto })
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
  async changePassword(@Body() changePasswordDto: AdminChangePasswordDto, @Req() req: any): Promise<void> {
    const { userId, oldPassword, newPassword, confirmPassword } = changePasswordDto;

    if (newPassword !== confirmPassword) {
      throw new HttpException('New password and confirm password do not match', HttpStatus.BAD_REQUEST);
    }

    // Ensure the userId in the DTO matches the authenticated user's ID from JWT
    if (userId !== req.user.id) {
      throw new HttpException('Unauthorized: Cannot change password for another user', HttpStatus.UNAUTHORIZED);
    }

    // Ensure the user has the 'admin' role
    if (req.user.role !== 'admin') {
      throw new HttpException('Unauthorized: Only admin users can use this endpoint', HttpStatus.UNAUTHORIZED);
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
}
