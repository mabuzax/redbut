import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { DataPreloaderService } from './data-preloader.service';

/**
 * Service for invalidating and reloading cached data when database tables are modified
 */
@Injectable()
export class CacheInvalidatorService {
  private readonly logger = new Logger(CacheInvalidatorService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private dataPreloaderService: DataPreloaderService,
  ) {}

  /**
   * Invalidate and reload menu items cache
   */
  async invalidateMenuItems(): Promise<void> {
    try {
      this.logger.log('Invalidating menu items cache...');
      
      // Delete all menu item related cache keys
      const keysToDelete = [
        'menu_items:all',
        'menu_items:active',
        'menu_items:by_category'
      ];

      for (const key of keysToDelete) {
        await this.cacheManager.del(key);
      }

      // Reload fresh data
      await this.dataPreloaderService.preloadMenuItems();
      
      this.logger.log('Menu items cache invalidated and reloaded successfully');
    } catch (error) {
      this.logger.error('Failed to invalidate menu items cache', error.stack);
      throw error;
    }
  }

  /**
   * Invalidate and reload waiters cache
   */
  async invalidateWaiters(): Promise<void> {
    try {
      this.logger.log('Invalidating waiters cache...');
      
      // Delete all waiter related cache keys
      const keysToDelete = [
        'waiters:all',
        'waiters:with_access'
      ];

      for (const key of keysToDelete) {
        await this.cacheManager.del(key);
      }

      // Reload fresh data
      await this.dataPreloaderService.preloadWaiters();
      
      this.logger.log('Waiters cache invalidated and reloaded successfully');
    } catch (error) {
      this.logger.error('Failed to invalidate waiters cache', error.stack);
      throw error;
    }
  }

  /**
   * Invalidate and reload access users cache
   */
  async invalidateAccessUsers(): Promise<void> {
    try {
      this.logger.log('Invalidating access users cache...');
      
      // Delete all access user related cache keys
      const keysToDelete = [
        'access_users:all',
        'access_users:by_type'
      ];

      for (const key of keysToDelete) {
        await this.cacheManager.del(key);
      }

      // Reload fresh data
      await this.dataPreloaderService.preloadAccessUsers();
      
      this.logger.log('Access users cache invalidated and reloaded successfully');
    } catch (error) {
      this.logger.error('Failed to invalidate access users cache', error.stack);
      throw error;
    }
  }

  /**
   * Invalidate all static data caches and reload
   */
  async invalidateAll(): Promise<void> {
    try {
      this.logger.log('Invalidating all static data caches...');
      
      await Promise.all([
        this.invalidateMenuItems(),
        this.invalidateWaiters(),
        this.invalidateAccessUsers()
      ]);
      
      this.logger.log('All static data caches invalidated and reloaded successfully');
    } catch (error) {
      this.logger.error('Failed to invalidate all caches', error.stack);
      throw error;
    }
  }

  /**
   * Clear specific cache key without reloading
   */
  async clearCacheKey(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.log(`Cache key '${key}' cleared successfully`);
    } catch (error) {
      this.logger.error(`Failed to clear cache key '${key}'`, error.stack);
      throw error;
    }
  }
}
