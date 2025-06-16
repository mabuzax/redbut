import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../common/prisma.service';
import { AdminRequestsController } from './admin-requests.controller';
import { AdminRequestsService } from './admin-requests.service';
import { AuthModule } from '../auth/auth.module';
import { AdminMenuController } from './admin-menu.controller';
import { AdminMenuService } from './admin-menu.service';
import { AdminStaffController } from './admin-staff.controller';
import { AdminStaffService } from './admin-staff.service';
import { AdminStaffAiService } from './admin-staff-ai.service';
import { AdminStaffAiController } from './admin-staff-ai.controller';

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
    AdminMenuController, // Controller for menu management
    AdminStaffController, // Controller for staff management
    AdminStaffAiController, // Controller for AI staff management
  ],
  providers: [
    AdminService,
    AdminRequestsService, // Dedicated service for request operations
    AdminMenuService, // Service for menu operations
    AdminStaffService, // Service for staff operations
    AdminStaffAiService, // Service for AI staff management
    PrismaService,
  ],
  exports: [
    AdminService,
    AdminRequestsService,
    AdminMenuService,
    AdminStaffService,
    AdminStaffAiService, // Export AI staff management service
  ],
})
export class AdminModule {}
