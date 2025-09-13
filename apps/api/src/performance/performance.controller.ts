import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PerformanceMonitorService } from '../common/performance-monitor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Performance monitoring endpoints for system administrators
 * Provides insights into cache performance, database metrics, and system health
 */
@ApiTags('Performance Monitoring')
@Controller('performance')
@UseGuards(JwtAuthGuard)
export class PerformanceController {
  constructor(
    private readonly performanceMonitorService: PerformanceMonitorService,
  ) {}

  /**
   * Get current performance metrics
   */
  @Get('metrics')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getMetrics() {
    return this.performanceMonitorService.getMetrics();
  }

  /**
   * Get Redis cache statistics
   */
  @Get('redis')
  @ApiOperation({ summary: 'Get Redis cache statistics' })
  @ApiResponse({ status: 200, description: 'Redis statistics retrieved successfully' })
  async getRedisCacheStats() {
    return this.performanceMonitorService.getRedisCacheStats();
  }

  /**
   * Get database performance statistics
   */
  @Get('database')
  @ApiOperation({ summary: 'Get database performance statistics' })
  @ApiResponse({ status: 200, description: 'Database statistics retrieved successfully' })
  async getDatabaseStats() {
    return this.performanceMonitorService.getDatabaseStats();
  }

  /**
   * Get comprehensive performance report
   */
  @Get('report')
  @ApiOperation({ summary: 'Get comprehensive performance report' })
  @ApiResponse({ status: 200, description: 'Performance report generated successfully' })
  async getPerformanceReport() {
    return this.performanceMonitorService.getPerformanceReport();
  }

  /**
   * Reset performance metrics (admin only)
   */
  @Get('reset')
  @ApiOperation({ summary: 'Reset performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics reset successfully' })
  async resetMetrics() {
    this.performanceMonitorService.resetMetrics();
    return { message: 'Performance metrics reset successfully' };
  }
}
