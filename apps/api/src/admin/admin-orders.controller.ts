import {
  Controller,
  Get,
  UseGuards,
  HttpStatus,
  Logger,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/role.guard';
import { AdminOrdersService } from './admin-orders.service';
import {
  CurrentShiftOrdersDataPoint,
  DailyOrdersDataPoint,
  OrderInsightsData,
} from './admin-orders.types';

@ApiTags('admin-orders')
@Controller('admin/orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminOrdersController {
  private readonly logger = new Logger(AdminOrdersController.name);

  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  @Get('current-shift-status')
  @ApiOperation({ summary: 'Get order statuses for the current or most recent shift' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Array of data points for orders in the current shift, categorized by an inferred status (new, in progress, completed). Each point includes a timeLabel and counts for each status.',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error.',
  })
  async getCurrentShiftOrdersByStatus(): Promise<CurrentShiftOrdersDataPoint[]> {
    try {
      return await this.adminOrdersService.getCurrentShiftOrdersByStatus();
    } catch (error) {
      this.logger.error(`Failed to get current shift orders by status: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to retrieve current shift order statuses',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('daily-this-month')
  @ApiOperation({ summary: 'Get total orders per day for the current month' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Array of daily order counts for the current month up to today. Each point includes a date (YYYY-MM-DD) and totalOrders count.',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error.',
  })
  async getOrdersPerDayThisMonth(): Promise<DailyOrdersDataPoint[]> {
    try {
      return await this.adminOrdersService.getOrdersPerDayThisMonth();
    } catch (error) {
      this.logger.error(`Failed to get orders per day this month: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to retrieve daily orders for this month',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get key order insights for today' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Object containing order insights for today: totalRevenueToday (number), averageOrderValue (number), peakOrderHour (string, e.g., "14:00 - 14:59"), and topSellingItems (array of {item: string, count: number}).',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error.',
  })
  async getOrderInsights(): Promise<OrderInsightsData> {
    try {
      return await this.adminOrdersService.getOrderInsights();
    } catch (error) {
      this.logger.error(`Failed to get order insights: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to retrieve order insights',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
