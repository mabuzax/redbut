import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  Logger,
  ValidationPipe,
  UsePipes,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/role.guard';
import { AdminAnalyticsService } from './admin-analytics.service';
import {
  SalesAnalyticsData,
  PopularItemsAnalyticsData,
  ShiftsAnalyticsData,
  HourlySalesAnalyticsData,
  StaffAnalyticsData,
  TablesAnalyticsData,
  WaiterRatingsAnalyticsData,
  RequestsAnalyticsData,
  CustomerRatingsAnalyticsData,
  DateRange,
} from './admin-analytics.types';
import { IsOptional, IsISO8601 } from 'class-validator';

class DateRangeQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for the analytics data range (ISO 8601 format, e.g., YYYY-MM-DD). Defaults to 7 or 30 days ago depending on the endpoint.',
    example: '2024-06-01',
    type: String,
    format: 'date'
  })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'startDate must be a valid ISO 8601 date string (YYYY-MM-DD)' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for the analytics data range (ISO 8601 format, e.g., YYYY-MM-DD). Defaults to today.',
    example: '2024-06-30',
    type: String,
    format: 'date'
  })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'endDate must be a valid ISO 8601 date string (YYYY-MM-DD)' })
  endDate?: string;
}

@ApiTags('admin-analytics')
@Controller('admin/analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminAnalyticsController {
  private readonly logger = new Logger(AdminAnalyticsController.name);

  constructor(private readonly adminAnalyticsService: AdminAnalyticsService) {}

  private handleServiceError(error: any, context: string): HttpException {
    this.logger.error(`Error in ${context}: ${error.message}`, error.stack);
    if (error instanceof HttpException) {
      return error;
    }
    return new HttpException(
      error.message || `Failed to retrieve ${context.toLowerCase()} analytics`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private getDateRangeFromDto(dto: DateRangeQueryDto): DateRange | undefined {
    if (dto.startDate && dto.endDate) {
      if (new Date(dto.startDate) > new Date(dto.endDate)) {
        throw new BadRequestException('startDate cannot be after endDate.');
      }
      return { startDate: dto.startDate, endDate: dto.endDate };
    }
    if (dto.startDate || dto.endDate) {
      throw new BadRequestException('Both startDate and endDate must be provided if one is present, or neither for default range.');
    }
    return undefined;
  }

  @Get('sales')
  @ApiOperation({ summary: 'Get sales analytics data' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Sales analytics data retrieved successfully.'})
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async getSalesAnalytics(@Query() dateRangeDto: DateRangeQueryDto): Promise<SalesAnalyticsData> {
    try {
      const dateRange = this.getDateRangeFromDto(dateRangeDto);
      return await this.adminAnalyticsService.getSalesAnalytics(dateRange);
    } catch (error) {
      throw this.handleServiceError(error, 'Sales Analytics');
    }
  }

  @Get('popular-items')
  @ApiOperation({ summary: 'Get popular items analytics data' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Popular items analytics data retrieved successfully.'})
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async getPopularItemsAnalytics(@Query() dateRangeDto: DateRangeQueryDto): Promise<PopularItemsAnalyticsData> {
    try {
      const dateRange = this.getDateRangeFromDto(dateRangeDto);
      return await this.adminAnalyticsService.getPopularItemsAnalytics(dateRange);
    } catch (error) {
      throw this.handleServiceError(error, 'Popular Items Analytics');
    }
  }

  @Get('shifts')
  @ApiOperation({ summary: 'Get shifts analytics data' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Shifts analytics data retrieved successfully.'})
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async getShiftsAnalytics(@Query() dateRangeDto: DateRangeQueryDto): Promise<ShiftsAnalyticsData> {
    try {
      const dateRange = this.getDateRangeFromDto(dateRangeDto);
      return await this.adminAnalyticsService.getShiftsAnalytics(dateRange);
    } catch (error) {
      throw this.handleServiceError(error, 'Shifts Analytics');
    }
  }

  @Get('hourly-sales')
  @ApiOperation({ summary: 'Get hourly sales analytics data' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (YYYY-MM-DD), defaults to today if not provided with endDate' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (YYYY-MM-DD), defaults to today if not provided with startDate' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Hourly sales analytics data retrieved successfully.'})
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async getHourlySalesAnalytics(@Query() dateRangeDto: DateRangeQueryDto): Promise<HourlySalesAnalyticsData> {
    try {
      const dateRange = this.getDateRangeFromDto(dateRangeDto);
      return await this.adminAnalyticsService.getHourlySalesAnalytics(dateRange);
    } catch (error) {
      throw this.handleServiceError(error, 'Hourly Sales Analytics');
    }
  }

  @Get('staff')
  @ApiOperation({ summary: 'Get staff performance analytics data' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Staff analytics data retrieved successfully.'})
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async getStaffAnalytics(@Query() dateRangeDto: DateRangeQueryDto): Promise<StaffAnalyticsData> {
    try {
      const dateRange = this.getDateRangeFromDto(dateRangeDto);
      return await this.adminAnalyticsService.getStaffAnalytics(dateRange);
    } catch (error) {
      throw this.handleServiceError(error, 'Staff Analytics');
    }
  }

  @Get('tables')
  @ApiOperation({ summary: 'Get tables analytics data' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tables analytics data retrieved successfully.'})
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async getTablesAnalytics(@Query() dateRangeDto: DateRangeQueryDto): Promise<TablesAnalyticsData> {
    try {
      const dateRange = this.getDateRangeFromDto(dateRangeDto);
      return await this.adminAnalyticsService.getTablesAnalytics(dateRange);
    } catch (error) {
      throw this.handleServiceError(error, 'Tables Analytics');
    }
  }

  @Get('waiter-ratings')
  @ApiOperation({ summary: 'Get waiter ratings analytics data' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Waiter ratings analytics data retrieved successfully.'})
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async getWaiterRatingsAnalytics(@Query() dateRangeDto: DateRangeQueryDto): Promise<WaiterRatingsAnalyticsData> {
    try {
      const dateRange = this.getDateRangeFromDto(dateRangeDto);
      return await this.adminAnalyticsService.getWaiterRatingsAnalytics(dateRange);
    } catch (error) {
      throw this.handleServiceError(error, 'Waiter Ratings Analytics');
    }
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get requests analytics data' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Requests analytics data retrieved successfully.'})
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async getRequestsAnalytics(@Query() dateRangeDto: DateRangeQueryDto): Promise<RequestsAnalyticsData> {
    try {
      const dateRange = this.getDateRangeFromDto(dateRangeDto);
      return await this.adminAnalyticsService.getRequestsAnalytics(dateRange);
    } catch (error) {
      throw this.handleServiceError(error, 'Requests Analytics');
    }
  }

  @Get('customer-ratings')
  @ApiOperation({ summary: 'Get customer ratings analytics data (overall restaurant feedback)' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Customer ratings analytics data retrieved successfully.'})
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async getCustomerRatingsAnalytics(@Query() dateRangeDto: DateRangeQueryDto): Promise<CustomerRatingsAnalyticsData> {
    try {
      const dateRange = this.getDateRangeFromDto(dateRangeDto);
      return await this.adminAnalyticsService.getCustomerRatingsAnalytics(dateRange);
    } catch (error) {
      throw this.handleServiceError(error, 'Customer Ratings Analytics');
    }
  }
}
