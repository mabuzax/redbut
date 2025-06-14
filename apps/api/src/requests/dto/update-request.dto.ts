import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { RequestStatus } from '../../common/types';

/**
 * DTO for updating an existing request
 * All fields are optional to support partial updates
 */
export class UpdateRequestDto {
  @ApiProperty({
    description: 'Request content (e.g., "Need waiter", "Ready to pay")',
    example: 'Need assistance with the menu',
    minLength: 3,
    maxLength: 500,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Request content must be a string' })
  @Length(3, 500, {
    message: 'Request content must be between 3 and 500 characters',
  })
  content?: string;

  @ApiProperty({
    description: 'Request status',
    enum: RequestStatus,
    enumName: 'RequestStatus',
    example: RequestStatus.OnHold,
    required: false,
  })
  @IsOptional()
  @IsEnum(RequestStatus, {
    message: `Status must be one of: ${Object.values(RequestStatus).join(', ')}`,
  })
  status?: RequestStatus;
}
