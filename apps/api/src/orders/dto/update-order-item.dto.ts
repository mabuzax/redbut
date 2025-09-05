import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsNumber,
  Min,
  IsArray,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for updating an existing order item
 */
export class UpdateOrderItemDto {
  @ApiProperty({
    description: 'Updated quantity of the menu item',
    example: 3,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiProperty({
    description: 'Updated price for the item',
    example: 14.99,
    type: Number,
    minimum: 0.01,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  price?: number;

  @ApiProperty({
    description: 'Selected options for the menu item',
    example: ['No onions', 'Extra cheese'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedOptions?: string[];

  @ApiProperty({
    description: 'Selected extras for the menu item',
    example: ['Bacon +$2', 'Avocado +$1.50'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedExtras?: string[];

  @ApiProperty({
    description: 'Special instructions for the item',
    example: 'Cook well done',
    required: false,
  })
  @IsOptional()
  @IsString()
  specialInstructions?: string;
}
