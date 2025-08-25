import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaService } from '../common/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { OrderStatusConfigService } from '../common/order-status-config.service';
import { OrderStatusConfigController } from './order-status-config.controller';

/**
 * Orders module for managing restaurant orders and bills
 * Handles retrieving order items and calculating bill totals
 */
@Module({
  imports: [
    // Import AuthModule to use JwtAuthGuard and authentication services
    AuthModule,
  ],
  controllers: [OrdersController, OrderStatusConfigController],
  providers: [
    OrdersService,
    PrismaService,
    OrderStatusConfigService,
  ],
  exports: [OrdersService, OrderStatusConfigService],
})
export class OrdersModule {}
