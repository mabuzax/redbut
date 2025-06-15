import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { WaiterAuthController } from './waiter-auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaService } from '../common/prisma.service';
import { UsersService } from '../users/users.service';
import { RolesGuard } from './guards/role.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET', 'super-secret-for-redbut-dev'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '7d'),
        },
      }),
    }),
  ],
  controllers: [AuthController, WaiterAuthController],
  providers: [
    AuthService,
    JwtStrategy,
    PrismaService,
    UsersService,
    RolesGuard,
  ],
  exports: [
    AuthService,
    JwtStrategy,
    PassportModule,
    RolesGuard,
    // Re-export JwtModule so other modules (e.g., ChatModule) can inject JwtService
    JwtModule,
  ],
})
export class AuthModule {}
