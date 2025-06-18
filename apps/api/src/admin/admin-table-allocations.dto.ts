import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsArray,
  ArrayNotEmpty,
  ArrayMinSize,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsDate,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ShiftInfoForAllocationDto {
  @ApiProperty({ description: "Shift's unique identifier.", format: 'uuid' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Date of the shift.', type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  date: Date;

  @ApiProperty({ description: 'Start time of the shift.', type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  startTime: Date;

  @ApiProperty({ description: 'End time of the shift.', type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  endTime: Date;
}

class WaiterInfoForAllocationDto {
  @ApiProperty({ description: "Waiter's unique identifier.", format: 'uuid' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: "Waiter's first name." })
  @IsString()
  name: string;

  @ApiProperty({ description: "Waiter's surname." })
  @IsString()
  surname: string;

  @ApiProperty({ description: "Waiter's tag name." })
  @IsString()
  tag_nickname: string;
}

export class CreateTableAllocationDto {
  @ApiProperty({
    description: 'Unique identifier of the shift for this allocation.',
    format: 'uuid',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsUUID()
  @IsNotEmpty()
  shiftId: string;

  @ApiProperty({
    description: 'Array of table numbers (1-50) to be allocated.',
    type: [Number],
    example: [1, 5, 10],
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsInt({ each: true, message: 'Each table number must be an integer.' })
  @Min(1, { each: true, message: 'Table number must be at least 1.' })
  @Max(50, { each: true, message: 'Table number cannot exceed 50.' })
  @Type(() => Number)
  tableNumbers: number[];

  @ApiProperty({
    description: 'Unique identifier of the waiter assigned to these tables for this shift.',
    format: 'uuid',
    example: 'b2c3d4e5-f6a7-8901-2345-67890abcdef0',
  })
  @IsUUID()
  @IsNotEmpty()
  waiterId: string;
}

export class UpdateTableAllocationDto {
  @ApiPropertyOptional({
    description: 'Optional new unique identifier of the shift for this allocation.',
    format: 'uuid',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsOptional()
  @IsUUID()
  shiftId?: string;

  @ApiPropertyOptional({
    description: 'Optional new array of table numbers (1-50) to be allocated.',
    type: [Number],
    example: [2, 6, 11],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsInt({ each: true, message: 'Each table number must be an integer.' })
  @Min(1, { each: true, message: 'Table number must be at least 1.' })
  @Max(50, { each: true, message: 'Table number cannot exceed 50.' })
  @Type(() => Number)
  tableNumbers?: number[];

  @ApiPropertyOptional({
    description: 'Optional new unique identifier of the waiter assigned to these tables for this shift.',
    format: 'uuid',
    example: 'b2c3d4e5-f6a7-8901-2345-67890abcdef0',
  })
  @IsOptional()
  @IsUUID()
  waiterId?: string;
}

export class TableAllocationResponseDto {
  @ApiProperty({ description: 'Unique identifier for the table allocation.', format: 'uuid' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Unique identifier of the associated shift.', format: 'uuid' })
  @IsUUID()
  shiftId: string;

  @ApiProperty({ description: 'Array of allocated table numbers.', type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  tableNumbers: number[];

  @ApiProperty({ description: 'Unique identifier of the assigned waiter.', format: 'uuid' })
  @IsUUID()
  waiterId: string;

  @ApiProperty({ description: 'Date and time of allocation creation.', type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Date and time of last allocation update.', type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Details of the associated shift.', type: () => ShiftInfoForAllocationDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShiftInfoForAllocationDto)
  shift?: ShiftInfoForAllocationDto | null;

  @ApiPropertyOptional({ description: 'Details of the assigned waiter.', type: () => WaiterInfoForAllocationDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => WaiterInfoForAllocationDto)
  waiter?: WaiterInfoForAllocationDto | null;
}
