import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsIn,
  MinLength,
  IsUrl,
  IsUUID,
  IsDate,
  ValidateNested,
  MaxLength,
  IsEnum,
  ValidateIf,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserType } from '@prisma/client';
import { STAFF_POSITIONS, StaffPosition, WaiterStatus } from './admin-staff.types';

@ValidatorConstraint({ name: 'EmailOrPhoneRequired', async: false })
export class EmailOrPhoneRequiredConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const object = args.object as any;
    return !!(object.email || object.phone);
  }

  defaultMessage(args: ValidationArguments) {
    return 'Either email or phone number must be provided';
  }
}

export class CreateStaffMemberDto {
  @ApiProperty({ description: 'First name of the staff member.', example: 'John' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Last name of the staff member.', example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  surname: string;

  @ApiPropertyOptional({
    description: 'Email address of the staff member. Either email or phone must be provided.',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @ValidateIf((o) => !o.phone || o.email) // Require email if no phone, or validate if email is provided
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Unique tag name or nickname for the staff member.', example: 'JohnnyD' })
  @IsString()
  @IsNotEmpty()
  tag_nickname: string;

  @ApiProperty({
    description: 'Position/role of the staff member.',
    enum: STAFF_POSITIONS,
    example: STAFF_POSITIONS[0],
  })
  @IsIn(STAFF_POSITIONS)
  position: StaffPosition;

  @ApiPropertyOptional({ description: 'Home address of the staff member.', example: '123 Main St, Anytown, USA' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ 
    description: 'Phone number of the staff member. Either email or phone must be provided.', 
    example: '555-123-4567' 
  })
  @IsOptional()
  @ValidateIf((o) => !o.email || o.phone) // Require phone if no email, or validate if phone is provided
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'URL to the profile picture of the staff member.', format: 'url', example: 'https://example.com/profile.jpg' })
  @IsOptional()
  @IsUrl()
  propic?: string;

  @ApiPropertyOptional({
    description: 'Password for the staff member. If not provided, a default password will be set, requiring a change on first login. Minimum 6 characters.',
    example: 'Password123!',
    minLength: 6,
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({
    description: 'Restaurant ID to assign the staff member to.',
    example: 'uuid-restaurant-id',
  })
  @IsNotEmpty()
  @IsUUID()
  restaurantId: string;
}

export class UpdateStaffMemberDto {
  @ApiPropertyOptional({ description: 'First name of the staff member.', example: 'John' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ description: 'Last name of the staff member.', example: 'Doe' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  surname?: string;

  @ApiPropertyOptional({ description: 'Unique tag name or nickname for the staff member.', example: 'JohnnyD' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tag_nickname?: string;

  @ApiPropertyOptional({
    description: 'Position/role of the staff member.',
    enum: STAFF_POSITIONS,
    example: STAFF_POSITIONS[0],
  })
  @IsOptional()
  @IsIn(STAFF_POSITIONS)
  position?: StaffPosition;

  @ApiPropertyOptional({
    description: 'Status of the staff member.',
    enum: WaiterStatus,
    example: WaiterStatus.Active,
  })
  @IsOptional()
  @IsEnum(WaiterStatus)
  status?: WaiterStatus;

  @ApiPropertyOptional({ description: 'Home address of the staff member.', example: '123 Main St, Anytown, USA' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Phone number of the staff member.', example: '555-123-4567' })
  @IsOptional()
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'URL to the profile picture of the staff member.', format: 'url', example: 'https://example.com/profile.jpg' })
  @IsOptional()
  @IsUrl()
  propic?: string;
}

export class AccessAccountInfoDto {
  @ApiProperty({ description: "Staff member's login username (typically email)." })
  @IsString()
  username: string;

  @ApiProperty({ description: "System role of the staff member.", enum: UserType, example: UserType.waiter })
  @IsEnum(UserType)
  userType: UserType;
}

export class StaffMemberResponseDto {
  @ApiProperty({ description: "Unique identifier for the staff member.", format: "uuid" })
  @IsUUID()
  id: string;

  @ApiProperty({ description: "First name." })
  @IsString()
  name: string;

  @ApiProperty({ description: "Last name." })
  @IsString()
  surname: string;

  @ApiProperty({ description: "Primary email address." })
  @IsEmail()
  email: string;

  @ApiProperty({ description: "Tag name or nickname." })
  @IsString()
  tag_nickname: string;

  @ApiPropertyOptional({ description: "Display position (e.g., Waiter, Chef). This might be derived from UserType or a dedicated field.", example: "Waiter" })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ description: "Home address.", nullable: true })
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional({ description: "Phone number.", nullable: true })
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional({ description: "URL to profile picture.", format: 'url', nullable: true })
  @IsOptional()
  @IsUrl()
  propic?: string | null;

  @ApiProperty({ description: "Date and time of creation.", type: Date })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: "Date and time of last update.", type: Date })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;

  @ApiPropertyOptional({ description: "Associated access account details.", type: () => AccessAccountInfoDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AccessAccountInfoDto)
  accessAccount?: AccessAccountInfoDto | null;
}
