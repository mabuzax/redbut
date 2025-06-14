import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsUUID, Length, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO for creating a new waiter request
 * Contains user identification, table number, and request content
 */
export class CreateRequestDto {
  @ApiProperty({
    description: 'ID of the user making the request',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  userId: string;

  @ApiProperty({
    description: 'Restaurant table number',
    example: 42,
    type: Number,
    minimum: 1,
    maximum: 999,
  })
  @IsNotEmpty({ message: 'Table number is required' })
  @IsInt({ message: 'Table number must be an integer' })
  @Min(1, { message: 'Table number must be at least 1' })
  @Max(999, { message: 'Table number cannot exceed 999' })
  @Transform(({ value }) => parseInt(value, 10))
  tableNumber: number;

  @ApiProperty({
    description: 'Request content (e.g., "Need waiter", "Ready to pay")',
    example: 'Need assistance with the menu',
    minLength: 3,
    maxLength: 500,
  })
  @IsNotEmpty({ message: 'Request content is required' })
  @IsString({ message: 'Request content must be a string' })
  @Length(3, 500, {
    message: 'Request content must be between 3 and 500 characters',
  })
  content: string;
}
