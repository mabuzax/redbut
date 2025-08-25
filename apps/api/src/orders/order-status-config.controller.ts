import { Controller, Get, Query, UseGuards, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderStatusConfigService } from '../common/order-status-config.service';
import { OrderStatus } from '@prisma/client';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

class GetOrderTransitionsQueryDto {
  @IsEnum(OrderStatus, { message: 'Invalid order status value' })
  @IsNotEmpty()
  currentStatus: OrderStatus;

  @IsString()
  @IsNotEmpty()
  userRole: string;
}

@ApiTags('order-status-config')
@ApiBearerAuth()
@Controller('api/v1/order-status-config')
@UseGuards(JwtAuthGuard)
export class OrderStatusConfigController {
  private readonly logger = new Logger(OrderStatusConfigController.name);

  constructor(
    private readonly orderStatusConfigService: OrderStatusConfigService,
  ) {}

  @Get('transitions')
  @ApiOperation({ summary: 'Get allowed order status transitions for a role and current status' })
  @ApiQuery({ name: 'currentStatus', enum: OrderStatus, required: true })
  @ApiQuery({ name: 'userRole', required: true })
  @ApiResponse({
    status: 200,
    description: 'List of allowed order status transitions',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          targetStatus: { type: 'string', enum: Object.values(OrderStatus) },
          label: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTransitions(
    @Query() query: GetOrderTransitionsQueryDto,
  ) {
    try {
      this.logger.debug(`Getting order transitions for status: ${query.currentStatus}, role: ${query.userRole}`);
      
      const transitions = await this.orderStatusConfigService.getAllowedTransitions(
        query.currentStatus,
        query.userRole,
      );
      
      return {
        currentStatus: query.currentStatus,
        userRole: query.userRole,
        transitions,
      };
    } catch (error) {
      this.logger.error(`Error getting order transitions: ${error.message}`);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Failed to retrieve order status transitions');
    }
  }
}
