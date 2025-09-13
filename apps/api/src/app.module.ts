import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { join } from 'path';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health/health.controller';
import { HelloController } from './hello/hello.controller';
import { AuthModule } from './auth/auth.module';
import { RequestsModule } from './requests/requests.module';
import { OrdersModule } from './orders/orders.module';
import { UsersModule } from './users/users.module';
import { PrismaService } from './common/prisma.service';
import { DataPreloaderService } from './common/data-preloader.service';
import { CachedDataService } from './common/cached-data.service';
import { CacheInvalidatorService } from './common/cache-invalidator.service';
import { CacheController } from './common/cache.controller';
import { RedisCacheModule } from './common/redis-cache.module';
import { ChatModule } from './chat/chat.module';
import { WaiterModule } from './waiter/waiter.module';
import { AdminModule } from './admin/admin.module';
import { MenuModule } from './menu/menu.module';
import { ServiceAnalysisModule } from './service-analysis/service-analysis.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { TokenRefreshInterceptor } from './auth/interceptors/token-refresh.interceptor';

@Module({
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      /**
       * Load env files from both the workspace root and the
       * `apps/api` folder so local development variables are always
       * picked up regardless of the current working directory.
       *
       * The order is important – the first file found wins.
       */
      envFilePath: [
        // Root-level envs (workspace root)
        join(process.cwd(), '.env.local'),
        join(process.cwd(), '.env'),
        // API-level envs (relative to compiled dist dir)
        join(__dirname, '..', '.env.local'),
        join(__dirname, '..', '.env'),
      ],
    }),
    
    // Health check module
    TerminusModule,

    // Redis cache module (imported here for global availability)
    RedisCacheModule,

    // Domain modules
    AuthModule,
    RequestsModule,
    OrdersModule,
    UsersModule,
    ChatModule, // WebSocket AI chat functionality
    WaiterModule, // Waiter dashboard & endpoints
    AdminModule, // Admin dashboard & endpoints
    MenuModule, // Public menu endpoints
    ServiceAnalysisModule, // Service feedback analysis
    RestaurantModule, // Restaurant management & subscriptions
  ],
  controllers: [HealthController, HelloController, CacheController],
  providers: [
    PrismaService,
    DataPreloaderService,
    CachedDataService,
    CacheInvalidatorService,
    // Global interceptor for token refresh
    {
      provide: APP_INTERCEPTOR,
      useClass: TokenRefreshInterceptor,
    },
  ],
})
export class AppModule {}
