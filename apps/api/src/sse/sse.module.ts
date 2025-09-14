import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SSEService } from './sse.service';
import { SSEController } from './sse.controller';
import { NotificationService } from './notification.service';
import { CacheRefreshService } from './cache-refresh.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [SSEController],
  providers: [
    SSEService,
    NotificationService,
    CacheRefreshService,
  ],
  exports: [
    SSEService,
    NotificationService,
    CacheRefreshService,
  ],
})
export class SSEModule {}