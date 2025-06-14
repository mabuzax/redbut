import { Module } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { PrismaService } from '../common/prisma.service';
import { AuthModule } from '../auth/auth.module';

/**
 * Requests module for handling waiter buzz requests
 * Manages the creation, retrieval and status updates of requests
 */
@Module({
  imports: [
    // Import AuthModule to use JwtAuthGuard and authentication services
    AuthModule,
  ],
  controllers: [RequestsController],
  providers: [
    RequestsService,
    PrismaService,
  ],
  exports: [RequestsService],
})
export class RequestsModule {}
