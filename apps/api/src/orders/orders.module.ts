import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaService } from '../common/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { OrderLogService } from '../common/order-log.service';

/**
 * Orders module for managing restaurant orders and bills
 * Handles retrieving order items and calculating bill totals
 */
@Module({
  imports: [
    // Import AuthModule to use JwtAuthGuard and authentication services
    AuthModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    PrismaService,
    OrderLogService,
  ],
  exports: [OrdersService, OrderLogService],
})
export class OrdersModule {}
