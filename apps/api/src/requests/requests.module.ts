import { Module } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { PrismaService } from '../common/prisma.service';
import { RequestStatusConfigService } from '../common/request-status-config.service';
import { AuthModule } from '../auth/auth.module';
import { RequestStatusConfigController } from './request-status-config.controller';

/**
 * Requests module for handling waiter buzz requests
 * Manages the creation, retrieval and status updates of requests
 */
@Module({
  imports: [
    // Import AuthModule to use JwtAuthGuard and authentication services
    AuthModule,
  ],
  controllers: [RequestsController, RequestStatusConfigController],
  providers: [
    RequestsService,
    PrismaService,
    RequestStatusConfigService,
  ],
  exports: [RequestsService, RequestStatusConfigService],
})
export class RequestsModule {}
