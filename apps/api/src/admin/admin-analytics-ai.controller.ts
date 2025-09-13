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
import { AdminAnalyticsAiService } from './admin-analytics-ai.service';
import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
import * as crypto from 'crypto';
import {
  SalesAnalyticsData,
  PopularItemsAnalyticsData,
  HourlySalesAnalyticsData,
  StaffAnalyticsData,
  TablesAnalyticsData,
  ServiceAnalysisData,
  RequestsAnalyticsData,
  CustomerRatingsAnalyticsData,
} from './admin-analytics.types';

class AiQueryDto {
  @ApiProperty({
    description: 'The user message or query for the AI data analyst.',
    example: "What were our total sales last week?",
  })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({ description: 'Optional thread ID for continuing an existing conversation.', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  threadId?: string;
}

@ApiTags('admin-analytics-ai')
@Controller('admin/analytics/ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminAnalyticsAiController {
  private readonly logger = new Logger(AdminAnalyticsAiController.name);

  constructor(private readonly adminAnalyticsAiService: AdminAnalyticsAiService) {}

  @Post('query')
  @ApiOperation({ summary: 'Process an AI query for data analytics across the restaurant system' })
  @ApiBody({ type: AiQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI response to the analytics query. The response can be a natural language string or structured JSON data representing the analysis.',
    schema: {
      oneOf: [
        { type: 'string', example: 'Total sales last week were $5,250.30 across 125 orders.' },
        { type: 'object', description: 'Could be any of the analytics data structures like SalesAnalyticsData, PopularItemsAnalyticsData, etc. Example shows SalesAnalyticsData.', 
          // Due to Swagger limitations with complex oneOf, we might not be able to list all specific $refs here easily.
          // For now, providing a generic object or a specific example.
          // example: { summary: { totalSales: 5250.30, totalOrders: 125, averageOrderValue: 42.00 }, salesTrend: [{date: "2024-06-10", sales: 700, orders: 20}] }
        },
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
  async processAnalyticsQuery(@Body() queryDto: AiQueryDto) {
    const thread_id = queryDto.threadId ?? crypto.randomUUID();
    this.logger.log(`Received AI analytics query for thread ${thread_id}: "${queryDto.message}"`);
    try {
      const response = await this.adminAnalyticsAiService.processAnalyticsQuery(queryDto.message, thread_id);
      return response;
    } catch (error) {
      this.logger.error(`Error processing AI analytics query for thread ${thread_id}: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to process AI analytics query',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
