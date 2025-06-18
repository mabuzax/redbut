import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShiftDto {
  @ApiProperty({
    description: 'Start date and time of the shift. Expected as a full ISO 8601 datetime string.',
    example: '2024-07-01T09:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  startTime: Date;

  @ApiProperty({
    description: 'End date and time of the shift. Expected as a full ISO 8601 datetime string.',
    example: '2024-07-01T17:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  endTime: Date;
}

export class UpdateShiftDto {
  @ApiPropertyOptional({
    description: 'Start date and time of the shift. Expected as a full ISO 8601 datetime string.',
    example: '2024-07-01T10:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startTime?: Date;

  @ApiPropertyOptional({
    description: 'End date and time of the shift. Expected as a full ISO 8601 datetime string.',
    example: '2024-07-01T18:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endTime?: Date;
}

export class ShiftResponseDto {
  @ApiProperty({ description: 'Unique identifier for the shift.', format: 'uuid' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Start date and time of the shift.', type: Date })
  @IsDate()
  @Type(() => Date)
  startTime: Date;

  @ApiProperty({ description: 'End date and time of the shift.', type: Date })
  @IsDate()
  @Type(() => Date)
  endTime: Date;

  @ApiProperty({ description: 'Date and time of shift creation.', type: Date })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Date and time of last shift update.', type: Date })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;
}
