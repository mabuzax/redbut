import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO for creating an anonymous user session
 * Requires a valid table number
 */
export class CreateAnonymousSessionDto {
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
}
