import {
  Controller,
  Post,
  Get,
  Body,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { SessionCacheService } from './session-cache.service';
import { DataPreloaderService } from './data-preloader.service';
import { CacheInvalidatorService } from './cache-invalidator.service';
import { CachedDataService } from './cached-data.service';

@ApiTags('cache')
@Controller('cache')
export class CacheController {
  constructor(
    private sessionCache: SessionCacheService,
    private dataPreloader: DataPreloaderService,
    private cacheInvalidator: CacheInvalidatorService,
    private cachedDataService: CachedDataService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get comprehensive cache statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache statistics including size and TTL information',
    schema: {
      type: 'object',
      properties: {
        sessionCache: {
          type: 'object',
          properties: {
            ttlMinutes: { type: 'number' },
            backend: { type: 'string' },
            size: { type: 'number' },
            description: { type: 'string' },
          },
        },
        staticDataCache: {
          type: 'object',
          properties: {
            staticDataTtlHours: { type: 'number' },
            backend: { type: 'string' },
            description: { type: 'string' },
            sizes: {
              type: 'object',
              properties: {
                menuItems: { type: 'number' },
                waiters: { type: 'number' },
                accessUsers: { type: 'number' },
              },
            },
          },
        },
      },
    },
  })
  async getCacheStats() {
    // Get cache sizes
    const menuItems = await this.cachedDataService.getMenuItems();
    const waiters = await this.cachedDataService.getWaiters();
    const accessUsers = await this.cachedDataService.getAccessUsers();
    
    // Get session cache stats (now async)
    const sessionStats = await this.sessionCache.getStats();

    return {
      sessionCache: {
        ...sessionStats,
        description: 'User session data with automatic expiration',
      },
      staticDataCache: {
        ...this.dataPreloader.getStats(),
        description: 'Static application data (menu, staff, users)',
        sizes: {
          menuItems: menuItems?.length || 0,
          waiters: waiters?.length || 0,
          accessUsers: accessUsers?.length || 0,
        },
      },
    };
  }

  @Post('refresh-static-data')
  @ApiOperation({ summary: 'Manually refresh all static data caches' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Static data cache refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        refreshedAt: { type: 'string' },
        itemsRefreshed: {
          type: 'object',
          properties: {
            menuItems: { type: 'number' },
            waiters: { type: 'number' },
            accessUsers: { type: 'number' },
          },
        },
      },
    },
  })
  async refreshStaticData() {
    await this.dataPreloader.onModuleInit();
    
    // Get updated sizes
    const menuItems = await this.cachedDataService.getMenuItems();
    const waiters = await this.cachedDataService.getWaiters();
    const accessUsers = await this.cachedDataService.getAccessUsers();

    return {
      message: 'All static data caches refreshed successfully',
      refreshedAt: new Date().toISOString(),
      itemsRefreshed: {
        menuItems: menuItems?.length || 0,
        waiters: waiters?.length || 0,
        accessUsers: accessUsers?.length || 0,
      },
    };
  }

  @Post('invalidate')
  @ApiOperation({ summary: 'Invalidate specific cache type and reload data' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Cache invalidated and reloaded successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        timestamp: { type: 'string' },
        type: { type: 'string' },
        itemsReloaded: { type: 'number' },
      },
    },
  })
  @ApiBody({ 
    schema: { 
      type: 'object',
      required: ['type'],
      properties: { 
        type: { 
          type: 'string', 
          enum: ['menu_items', 'waiters', 'access_users', 'all'],
          description: 'Type of cache to invalidate'
        } 
      } 
    } 
  })
  async invalidateCache(@Body() body: { type: 'menu_items' | 'waiters' | 'access_users' | 'all' }) {
    const { type } = body;
    
    if (!type) {
      throw new BadRequestException('Cache type is required');
    }

    let itemsReloaded = 0;
    
    switch (type) {
      case 'menu_items':
        await this.cacheInvalidator.invalidateMenuItems();
        const menuItems = await this.cachedDataService.getMenuItems();
        itemsReloaded = menuItems?.length || 0;
        break;
      case 'waiters':
        await this.cacheInvalidator.invalidateWaiters();
        const waiters = await this.cachedDataService.getWaiters();
        itemsReloaded = waiters?.length || 0;
        break;
      case 'access_users':
        await this.cacheInvalidator.invalidateAccessUsers();
        const accessUsers = await this.cachedDataService.getAccessUsers();
        itemsReloaded = accessUsers?.length || 0;
        break;
      case 'all':
        await this.cacheInvalidator.invalidateAll();
        const allMenuItems = await this.cachedDataService.getMenuItems();
        const allWaiters = await this.cachedDataService.getWaiters();
        const allAccessUsers = await this.cachedDataService.getAccessUsers();
        itemsReloaded = (allMenuItems?.length || 0) + (allWaiters?.length || 0) + (allAccessUsers?.length || 0);
        break;
      default:
        throw new BadRequestException('Invalid cache type. Must be one of: menu_items, waiters, access_users, all');
    }
    
    return {
      message: `Cache '${type}' invalidated and reloaded successfully`,
      timestamp: new Date().toISOString(),
      type,
      itemsReloaded,
    };
  }

  @Post('clear')
  @ApiOperation({ summary: 'Clear specific cache without reloading (for maintenance)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Cache cleared successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        timestamp: { type: 'string' },
        clearedKeys: { 
          type: 'array',
          items: { type: 'string' }
        },
      },
    },
  })
  @ApiBody({ 
    schema: { 
      type: 'object',
      required: ['keys'],
      properties: { 
        keys: { 
          type: 'array',
          items: { type: 'string' },
          description: 'Cache keys to clear',
          example: ['menu_items:all', 'waiters:all']
        } 
      } 
    } 
  })
  async clearCache(@Body() body: { keys: string[] }) {
    const { keys } = body;
    
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      throw new BadRequestException('Keys array is required and must not be empty');
    }

    for (const key of keys) {
      await this.cacheInvalidator.clearCacheKey(key);
    }
    
    return {
      message: `${keys.length} cache key(s) cleared successfully`,
      timestamp: new Date().toISOString(),
      clearedKeys: keys,
    };
  }
}
