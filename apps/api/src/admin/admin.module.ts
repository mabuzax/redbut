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
import { AdminShiftsController } from './admin-shifts.controller';
import { AdminShiftsService } from './admin-shifts.service';
import { AdminShiftsAiController } from './admin-shifts-ai.controller';
import { AdminShiftsAiService } from './admin-shifts-ai.service';
import { AdminTableAllocationsController } from './admin-table-allocations.controller';
import { AdminTableAllocationsService } from './admin-table-allocations.service';
import { AdminTableAllocationsAiController } from './admin-table-allocations-ai.controller';
import { AdminTableAllocationsAiService } from './admin-table-allocations-ai.service';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';

@Module({
  imports: [
    AuthModule,
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
    AdminRequestsController,
    AdminMenuController,
    AdminStaffController,
    AdminStaffAiController,
    AdminShiftsController,
    AdminShiftsAiController,
    AdminTableAllocationsController,
    AdminTableAllocationsAiController,
    AdminOrdersController,
  ],
  providers: [
    AdminService,
    AdminRequestsService,
    AdminMenuService,
    AdminStaffService,
    AdminStaffAiService,
    AdminShiftsService,
    AdminShiftsAiService,
    AdminTableAllocationsService,
    AdminTableAllocationsAiService,
    AdminOrdersService,
    PrismaService,
  ],
  exports: [
    AdminService,
    AdminRequestsService,
    AdminMenuService,
    AdminStaffService,
    AdminStaffAiService,
    AdminShiftsService,
    AdminShiftsAiService,
    AdminTableAllocationsService,
    AdminTableAllocationsAiService,
    AdminOrdersService,
  ],
})
export class AdminModule {}
