import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpStatus,
  ValidationPipe,
  UsePipes,
  HttpException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/role.guard';
import { AdminTableAllocationsAiService } from './admin-table-allocations-ai.service';
import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
import { TableAllocationResponseDto } from './admin-table-allocations.dto';
import * as crypto from 'crypto';

class AiQueryDto {
  @ApiProperty({
    description: 'The user message or query for the AI assistant related to table allocation management.',
    example: "Allocate tables 1, 2, and 5 to waiter 'uuid-waiter' for shift 'uuid-shift'.",
  })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({ description: 'Optional thread ID for continuing an existing conversation.', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  threadId?: string;
}

@ApiTags('admin-table-allocations-ai')
@Controller('admin/table-allocations/ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminTableAllocationsAiController {
  private readonly logger = new Logger(AdminTableAllocationsAiController.name);

  constructor(private readonly adminTableAllocationsAiService: AdminTableAllocationsAiService) {}

  @Post('query')
  @ApiOperation({ summary: 'Process an AI query related to table allocation management' })
  @ApiBody({ type: AiQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI response to the query. The response structure varies based on the AI action.',
    schema: {
      oneOf: [
        { type: 'string', example: 'Tables [1, 2, 5] allocated to Waiter John Doe for shift XYZ successfully.' },
        { $ref: `#/components/schemas/${TableAllocationResponseDto.name}` },
        { type: 'array', items: { $ref: `#/components/schemas/${TableAllocationResponseDto.name}` } },
        { type: 'object', properties: { message: { type: 'string', example: "Allocation with ID 'abc' has been deleted." } } },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or AI processing error.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions.',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async processTableAllocationsQuery(@Body() queryDto: AiQueryDto) {
    const thread_id = queryDto.threadId ?? crypto.randomUUID();
    this.logger.log(`Received AI table allocations query for thread ${thread_id}: "${queryDto.message}"`);
    try {
      const response = await this.adminTableAllocationsAiService.processTableAllocationsQuery(queryDto.message, thread_id);
      return response;
    } catch (error) {
      this.logger.error(`Error processing AI table allocations query for thread ${thread_id}: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to process AI table allocations query',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
