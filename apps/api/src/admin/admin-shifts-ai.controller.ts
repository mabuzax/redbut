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
  ApiPropertyOptional, // Added ApiPropertyOptional here
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/role.guard';
import { AdminShiftsAiService } from './admin-shifts-ai.service';
import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
import { ShiftResponseDto } from './admin-shifts.dto';
import * as crypto from 'crypto';

class AiQueryDto {
  @ApiProperty({ description: 'The user message or query for the AI assistant related to shift management.', example: "Create a morning shift for staff member 'xyz' tomorrow from 9 AM to 5 PM." })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({ description: 'Optional thread ID for continuing an existing conversation.', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  threadId?: string;
}

@ApiTags('admin-shifts-ai')
@Controller('admin/shifts/ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminShiftsAiController {
  private readonly logger = new Logger(AdminShiftsAiController.name);

  constructor(private readonly adminShiftsAiService: AdminShiftsAiService) {}

  @Post('query')
  @ApiOperation({ summary: 'Process an AI query related to shift management' })
  @ApiBody({ type: AiQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI response to the query. The response structure varies based on the AI action.',
    schema: {
      oneOf: [
        { type: 'string', example: 'Shift for John Doe created successfully.' },
        { $ref: '#/components/schemas/ShiftResponseDto' },
        { type: 'array', items: { $ref: '#/components/schemas/ShiftResponseDto' } },
        { type: 'object', properties: { message: { type: 'string', example: "Shift with ID 'abc' has been deleted." } } },
        { type: 'array', items: { type: 'string' }, example: ["Morning", "Afternoon", "Evening"] },
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
  async processShiftsQuery(@Body() queryDto: AiQueryDto) {
    const thread_id = queryDto.threadId ?? crypto.randomUUID();
    this.logger.log(`Received AI shifts query for thread ${thread_id}: "${queryDto.message}"`);
    try {
      const response = await this.adminShiftsAiService.processShiftsQuery(queryDto.message, thread_id);
      return response;
    } catch (error) {
      this.logger.error(`Error processing AI shifts query for thread ${thread_id}: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to process AI shifts query',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
