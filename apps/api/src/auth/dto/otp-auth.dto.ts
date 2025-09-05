import { IsEmail, IsString, IsEnum, IsOptional } from 'class-validator';

export class GenerateOTPDto {
  @IsString()
  emailOrPhone: string;

  @IsEnum(['waiter', 'admin', 'manager'])
  userType: 'waiter' | 'admin' | 'manager';
}

export class VerifyOTPDto {
  @IsString()
  username: string;

  @IsString()
  otp: string;

  @IsEnum(['waiter', 'admin', 'manager'])
  userType: 'waiter' | 'admin' | 'manager';
}

export class OTPGenerationResponseDto {
  message: string;
  username: string;
}

export class OTPVerificationResponseDto {
  waiter: any;
  token: string;
}
