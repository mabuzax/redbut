import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for anonymous session creation
 * Contains user identification and authentication token
 */
export class AnonymousSessionResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the user',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  userId: string;

  @ApiProperty({
    description: 'Restaurant table number',
    example: 42,
    type: Number,
  })
  tableNumber: number;

  @ApiProperty({
    description: 'Unique session identifier',
    example: 'lktu7a8d-r4nd0m-s3ss10n-1d',
  })
  sessionId: string;

  @ApiProperty({
    description: 'JWT authentication token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;
}
