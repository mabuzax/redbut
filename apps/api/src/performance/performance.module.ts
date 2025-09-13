import { Module } from '@nestjs/common';
import { PerformanceController } from './performance.controller';
import { PerformanceMonitorService } from '../common/performance-monitor.service';
import { PrismaService } from '../common/prisma.service';
import { RedisCacheModule } from '../common/redis-cache.module';

@Module({
  imports: [RedisCacheModule],
  controllers: [PerformanceController],
  providers: [PerformanceMonitorService, PrismaService],
  exports: [PerformanceMonitorService],
})
export class PerformanceModule {}
