import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsNumber, Min, Max, Length } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * DTO for creating a new order item
 * Contains table number, session ID, item description, and price
 */
export class CreateOrderDto {
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
    description: 'Session identifier for the order',
    example: 'lktu7a8d-r4nd0m-s3ss10n-1d',
  })
  @IsNotEmpty({ message: 'Session ID is required' })
  @IsString({ message: 'Session ID must be a string' })
  sessionId: string;

  @ApiProperty({
    description: 'Item description',
    example: 'Margherita Pizza',
    minLength: 2,
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Item description is required' })
  @IsString({ message: 'Item description must be a string' })
  @Length(2, 100, {
    message: 'Item description must be between 2 and 100 characters',
  })
  item: string;

  @ApiProperty({
    description: 'Item price',
    example: 12.99,
    type: Number,
    minimum: 0.01,
  })
  @IsNotEmpty({ message: 'Price is required' })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Price must be a number with at most 2 decimal places' }
  )
  @Min(0.01, { message: 'Price must be at least 0.01' })
  @Type(() => Number)
  price: number;
}
