import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get('REDIS_HOST', 'localhost');
        const redisPort = configService.get('REDIS_PORT', 6379);
        const redisPassword = configService.get('REDIS_PASSWORD');
        
        return {
          store: redisStore,
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          ttl: 30 * 60 * 1000, // 30 minutes default TTL
          max: 1000, // Maximum number of items in cache
        };
      },
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
