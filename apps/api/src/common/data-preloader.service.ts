import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from './prisma.service';
import { ConfigService } from '@nestjs/config';

/**
 * Data preloader service that caches static/semi-static data on startup
 * Improves API performance by reducing database queries for frequently accessed data
 */
@Injectable()
export class DataPreloaderService implements OnModuleInit {
  private readonly logger = new Logger(DataPreloaderService.name);
  private readonly staticDataTtlHours: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    // Static data TTL - default 24 hours, configurable
    this.staticDataTtlHours = this.configService.get<number>('STATIC_DATA_CACHE_TTL_HOURS', 24);
  }

  /**
   * Called when the module is initialized - preload all static data
   */
  async onModuleInit() {
    this.logger.log('Starting data preloading...');
    
    try {
      await Promise.all([
        this.preloadMenuItems(),
        this.preloadWaiters(),
        this.preloadAccessUsers(),
      ]);
      
      this.logger.log('Data preloading completed successfully');
    } catch (error) {
      this.logger.error(`Data preloading failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Preload all menu items into cache
   */
  async preloadMenuItems(): Promise<void> {
    try {
      const menuItems = await this.prisma.menuItem.findMany();

      const ttlMs = this.staticDataTtlHours * 60 * 60 * 1000;

      // Cache all menu items as a collection
      await this.cacheManager.set('static:menu_items:all', menuItems, ttlMs);

      // Cache individual menu items by ID for quick lookups
      for (const item of menuItems) {
        await this.cacheManager.set(`static:menu_item:${item.id}`, item, ttlMs);
      }

      // Cache menu items by category for filtering
      const itemsByCategory = menuItems.reduce((acc, item) => {
        const categoryName = item.category || 'uncategorized';
        if (!acc[categoryName]) {
          acc[categoryName] = [];
        }
        acc[categoryName].push(item);
        return acc;
      }, {} as Record<string, any[]>);

      for (const [categoryName, items] of Object.entries(itemsByCategory)) {
        await this.cacheManager.set(`static:menu_items:category:${categoryName}`, items, ttlMs);
      }

      // Cache active menu items only
      const activeItems = menuItems.filter(item => item.status === 'Active');
      await this.cacheManager.set('static:menu_items:active', activeItems, ttlMs);

      this.logger.log(`Preloaded ${menuItems.length} menu items (${activeItems.length} active) into cache`);
    } catch (error) {
      this.logger.error(`Failed to preload menu items: ${error.message}`);
      throw error;
    }
  }

  /**
   * Preload all waiters into cache
   */
  async preloadWaiters(): Promise<void> {
    try {
      const waiters = await this.prisma.waiter.findMany({
        include: {
          accessAccount: true,
        },
      });

      const ttlMs = this.staticDataTtlHours * 60 * 60 * 1000;

      // Cache all waiters as a collection
      await this.cacheManager.set('static:waiters:all', waiters, ttlMs);

      // Cache individual waiters by ID
      for (const waiter of waiters) {
        await this.cacheManager.set(`static:waiter:${waiter.id}`, waiter, ttlMs);
      }

      // Cache waiters with access accounts only
      const waitersWithAccess = waiters.filter(w => w.accessAccount);
      await this.cacheManager.set('static:waiters:with_access', waitersWithAccess, ttlMs);

      this.logger.log(`Preloaded ${waiters.length} waiters (${waitersWithAccess.length} with access) into cache`);
    } catch (error) {
      this.logger.error(`Failed to preload waiters: ${error.message}`);
      throw error;
    }
  }

  /**
   * Preload all access users into cache
   */
  async preloadAccessUsers(): Promise<void> {
    try {
      const accessUsers = await this.prisma.accessUser.findMany({
        include: {
          waiter: true,
        },
      });

      const ttlMs = this.staticDataTtlHours * 60 * 60 * 1000;

      // Cache all access users as a collection
      await this.cacheManager.set('static:access_users:all', accessUsers, ttlMs);

      // Cache individual access users by userId (primary key)
      for (const user of accessUsers) {
        await this.cacheManager.set(`static:access_user:userId:${user.userId}`, user, ttlMs);
        
        // Also cache by username for quick auth lookups
        if (user.username) {
          await this.cacheManager.set(`static:access_user:username:${user.username}`, user, ttlMs);
        }
      }

      // Cache by user type
      const usersByType = accessUsers.reduce((acc, user) => {
        const type = user.userType || 'waiter';
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(user);
        return acc;
      }, {} as Record<string, any[]>);

      for (const [userType, users] of Object.entries(usersByType)) {
        await this.cacheManager.set(`static:access_users:type:${userType}`, users, ttlMs);
      }

      this.logger.log(`Preloaded ${accessUsers.length} access users into cache`);
    } catch (error) {
      this.logger.error(`Failed to preload access users: ${error.message}`);
      throw error;
    }
  }

  /**
   * Refresh cached data manually (useful for admin operations)
   */
  async refreshStaticData(): Promise<void> {
    this.logger.log('Refreshing static data cache...');
    await this.onModuleInit();
  }

  /**
   * Invalidate specific data type from cache
   */
  async invalidateDataType(dataType: 'menu_items' | 'waiters' | 'access_users'): Promise<void> {
    try {
      switch (dataType) {
        case 'menu_items':
          // Note: Redis doesn't have efficient pattern deletion in cache-manager
          // In production, consider using Redis SCAN + DEL for pattern matching
          await this.cacheManager.del('static:menu_items:all');
          this.logger.log('Invalidated menu items cache - consider full refresh');
          break;
        case 'waiters':
          await this.cacheManager.del('static:waiters:all');
          await this.cacheManager.del('static:waiters:with_access');
          this.logger.log('Invalidated waiters cache');
          break;
        case 'access_users':
          await this.cacheManager.del('static:access_users:all');
          this.logger.log('Invalidated access users cache');
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to invalidate ${dataType} cache: ${error.message}`);
    }
  }

  /**
   * Get cache statistics for static data
   */
  getStats(): { staticDataTtlHours: number; backend: string } {
    return {
      staticDataTtlHours: this.staticDataTtlHours,
      backend: 'Redis',
    };
  }
}
