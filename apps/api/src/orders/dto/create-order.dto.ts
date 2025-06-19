import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  Max,
  Length,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * DTO for creating a new order item
 * Contains table number, session ID, item description, and price
 */
export class CreateOrderItemDto {
  @ApiProperty({
    description: 'Referenced MenuItem ID',
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
  })
  @IsNotEmpty()
  @IsString()
  menuItemId: string;

  @ApiProperty({
    description: 'Quantity of the menu item ordered',
    example: 2,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'Item price at the moment of ordering',
    example: 12.99,
    type: Number,
    minimum: 0.01,
  })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  price: number;
}

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
    description: 'Optional user ID if the diner is registered',
    example: 'b3c9d851-4f1f-4dd2-9fbd-0c42d6e9c2ee',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    description: 'Array of items included in the order',
    type: () => [CreateOrderItemDto],
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
