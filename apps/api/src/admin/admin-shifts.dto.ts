import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDate,
  IsIn,
  IsEnum,
  ValidateNested,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SHIFT_TYPES, ShiftType, SHIFT_STATUSES, ShiftStatus } from './admin-shifts.types';

export class CreateShiftDto {
  @ApiProperty({ description: 'Unique identifier of the staff member assigned to the shift.', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' })
  @IsUUID()
  @IsNotEmpty()
  staffId: string;

  @ApiProperty({ description: 'Start date and time of the shift.', type: Date, example: '2024-07-01T09:00:00.000Z' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  startTime: Date;

  @ApiProperty({ description: 'End date and time of the shift.', type: Date, example: '2024-07-01T17:00:00.000Z' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  endTime: Date;

  @ApiProperty({ description: 'Type of the shift.', enum: SHIFT_TYPES, example: SHIFT_TYPES[0] })
  @IsIn(SHIFT_TYPES)
  @IsNotEmpty()
  type: ShiftType;

  @ApiPropertyOptional({ description: 'Status of the shift.', enum: SHIFT_STATUSES, default: SHIFT_STATUSES[0], example: SHIFT_STATUSES[0] })
  @IsOptional()
  @IsIn(SHIFT_STATUSES)
  status?: ShiftStatus = SHIFT_STATUSES[0];

  @ApiPropertyOptional({ description: 'Optional notes for the shift.', example: 'Covering for Jane.', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateShiftDto {
  @ApiPropertyOptional({ description: 'Start date and time of the shift.', type: Date, example: '2024-07-01T09:00:00.000Z' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startTime?: Date;

  @ApiPropertyOptional({ description: 'End date and time of the shift.', type: Date, example: '2024-07-01T17:00:00.000Z' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endTime?: Date;

  @ApiPropertyOptional({ description: 'Type of the shift.', enum: SHIFT_TYPES, example: SHIFT_TYPES[0] })
  @IsOptional()
  @IsIn(SHIFT_TYPES)
  type?: ShiftType;

  @ApiPropertyOptional({ description: 'Status of the shift.', enum: SHIFT_STATUSES, example: SHIFT_STATUSES[1] })
  @IsOptional()
  @IsIn(SHIFT_STATUSES)
  status?: ShiftStatus;

  @ApiPropertyOptional({ description: 'Optional notes for the shift.', example: 'Shift extended by 1 hour.', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

class MinimalStaffInfoResponseDto {
  @ApiProperty({ description: "Staff member's ID.", format: "uuid" })
  @IsUUID()
  id: string;

  @ApiProperty({ description: "Staff member's first name." })
  @IsString()
  name: string;

  @ApiProperty({ description: "Staff member's last name." })
  @IsString()
  surname: string;

  @ApiProperty({ description: "Staff member's tag name." })
  @IsString()
  tag_nickname: string;

  @ApiPropertyOptional({ description: "Staff member's position." })
  @IsOptional()
  @IsString()
  position?: string;
}


export class ShiftResponseDto {
  @ApiProperty({ description: 'Unique identifier for the shift.', format: 'uuid' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Unique identifier of the assigned staff member.', format: 'uuid' })
  @IsUUID()
  staffId: string;

  @ApiProperty({ description: 'Start date and time of the shift.', type: Date })
  @IsDate()
  @Type(() => Date)
  startTime: Date;

  @ApiProperty({ description: 'End date and time of the shift.', type: Date })
  @IsDate()
  @Type(() => Date)
  endTime: Date;

  @ApiProperty({ description: 'Type of the shift.', enum: SHIFT_TYPES })
  @IsEnum(SHIFT_TYPES)
  type: ShiftType;

  @ApiProperty({ description: 'Status of the shift.', enum: SHIFT_STATUSES })
  @IsEnum(SHIFT_STATUSES)
  status: ShiftStatus;

  @ApiPropertyOptional({ description: 'Optional notes for the shift.', nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiProperty({ description: 'Date and time of shift creation.', type: Date })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Date and time of last shift update.', type: Date })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Information about the assigned staff member.', type: () => MinimalStaffInfoResponseDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => MinimalStaffInfoResponseDto)
  staffMember?: MinimalStaffInfoResponseDto | null;
}
