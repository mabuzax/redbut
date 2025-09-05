import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { MenuItem, Waiter, AccessUser } from '@prisma/client';

/**
 * Cached data retrieval service
 * Provides easy access to cached static data with fallback to database
 */
@Injectable()
export class CachedDataService {
  private readonly logger = new Logger(CachedDataService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get all menu items from cache
   */
  async getMenuItems(): Promise<MenuItem[] | null> {
    try {
      const result = await this.cacheManager.get<MenuItem[]>('static:menu_items:all');
      return result || null;
    } catch (error) {
      this.logger.error(`Failed to get menu items from cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Get active menu items from cache
   */
  async getActiveMenuItems(): Promise<MenuItem[] | null> {
    try {
      const result = await this.cacheManager.get<MenuItem[]>('static:menu_items:active');
      return result || null;
    } catch (error) {
      this.logger.error(`Failed to get active menu items from cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Get menu items by category from cache
   */
  async getMenuItemsByCategory(category: string): Promise<MenuItem[] | null> {
    try {
      const result = await this.cacheManager.get<MenuItem[]>(`static:menu_items:category:${category}`);
      return result || null;
    } catch (error) {
      this.logger.error(`Failed to get menu items by category from cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Get menu item by ID from cache
   */
  async getMenuItem(id: string): Promise<MenuItem | null> {
    try {
      const result = await this.cacheManager.get<MenuItem>(`static:menu_item:${id}`);
      return result || null;
    } catch (error) {
      this.logger.error(`Failed to get menu item from cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all waiters from cache
   */
  async getWaiters(): Promise<Waiter[] | null> {
    try {
      const result = await this.cacheManager.get<Waiter[]>('static:waiters:all');
      return result || null;
    } catch (error) {
      this.logger.error(`Failed to get waiters from cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Get waiters with access accounts from cache
   */
  async getWaitersWithAccess(): Promise<Waiter[] | null> {
    try {
      const result = await this.cacheManager.get<Waiter[]>('static:waiters:with_access');
      return result || null;
    } catch (error) {
      this.logger.error(`Failed to get waiters with access from cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Get waiter by ID from cache
   */
  async getWaiter(id: string): Promise<Waiter | null> {
    try {
      const result = await this.cacheManager.get<Waiter>(`static:waiter:${id}`);
      return result || null;
    } catch (error) {
      this.logger.error(`Failed to get waiter from cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all access users from cache
   */
  async getAccessUsers(): Promise<AccessUser[] | null> {
    try {
      const result = await this.cacheManager.get<AccessUser[]>('static:access_users:all');
      return result || null;
    } catch (error) {
      this.logger.error(`Failed to get access users from cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Get access users by type from cache
   */
  async getAccessUsersByType(userType: string): Promise<AccessUser[] | null> {
    try {
      const result = await this.cacheManager.get<AccessUser[]>(`static:access_users:type:${userType}`);
      return result || null;
    } catch (error) {
      this.logger.error(`Failed to get access users by type from cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Get access user by userId from cache
   */
  async getAccessUserByUserId(userId: string): Promise<AccessUser | null> {
    try {
      const result = await this.cacheManager.get<AccessUser>(`static:access_user:userId:${userId}`);
      return result || null;
    } catch (error) {
      this.logger.error(`Failed to get access user by userId from cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Get access user by username from cache
   */
  async getAccessUserByUsername(username: string): Promise<AccessUser | null> {
    try {
      const result = await this.cacheManager.get<AccessUser>(`static:access_user:username:${username}`);
      return result || null;
    } catch (error) {
      this.logger.error(`Failed to get access user by username from cache: ${error.message}`);
      return null;
    }
  }
}
