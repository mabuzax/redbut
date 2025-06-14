import { Module } from '@nestjs/common';
import { WaiterController } from './waiter.controller';
import { WaiterService } from './waiter.service';
import { PrismaService } from '../common/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { RequestsModule } from '../requests/requests.module';
import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from '../users/users.module';

/**
 * Waiter Module for managing waiter-specific operations and dashboard data.
 * Integrates with authentication, requests, orders, and user services.
 */
@Module({
  imports: [
    AuthModule, // For JWT authentication
    RequestsModule, // For managing requests
    OrdersModule, // For managing orders and bills
    UsersModule, // For user-related data (e.g., fetching user details for requests)
  ],
  controllers: [WaiterController],
  providers: [
    WaiterService,
    PrismaService, // Provided globally, but explicitly listed here for clarity if needed
  ],
  exports: [WaiterService], // Export if other modules need to inject WaiterService
})
export class WaiterModule {}
