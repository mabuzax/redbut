import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../common/prisma.service';
import { AdminRequestsController } from './admin-requests.controller';
import { AdminRequestsService } from './admin-requests.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    // Re-use JWT module configuration from auth module
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1d'),
        },
      }),
    }),
  ],
  controllers: [
    AdminController,
    AdminRequestsController, // Dedicated controller for request management
  ],
  providers: [
    AdminService,
    AdminRequestsService, // Dedicated service for request operations
    PrismaService,
  ],
  exports: [
    AdminService,
    AdminRequestsService,
  ],
})
export class AdminModule {}
