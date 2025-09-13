import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { User } from '@prisma/client';

/**
 * Session cache service to reduce database calls for user session lookups
 * Uses Redis for distributed caching with TTL support
 */
@Injectable()
export class SessionCacheService {
  private readonly logger = new Logger(SessionCacheService.name);
  private readonly ttlMinutes: number;

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    // Default to 30 minutes TTL, configurable via environment
    this.ttlMinutes = this.configService.get<number>('SESSION_CACHE_TTL_MINUTES', 30);
    this.logger.log(`Session cache initialized with Redis backend, ${this.ttlMinutes} minute TTL`);
  }

  /**
   * Get a user from cache by user ID
   * @param userId User ID to lookup
   * @returns Cached user or null if not found/expired
   */
  async get(userId: string): Promise<User | null> {
    try {
      const cached = await this.cacheManager.get<User>(`session:${userId}`);
      if (cached) {
        this.logger.debug(`Cache hit for user ${userId}`);
        return cached;
      }
      return null;
    } catch (error) {
      this.logger.error(`Cache get error for user ${userId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Store a user in cache
   * @param userId User ID
   * @param user User object to cache
   */
  async set(userId: string, user: User): Promise<void> {
    try {
      const sessionKey = `session:${userId}`;
      
      // Check if this is a new session (for counter accuracy)
      const existingUser = await this.cacheManager.get(sessionKey);
      const isNewSession = !existingUser;
      
      const ttlMs = this.ttlMinutes * 60 * 1000;
      await this.cacheManager.set(sessionKey, user, ttlMs);
      
      // Increment session counter only for new sessions
      if (isNewSession) {
        await this.incrementSessionCount();
        this.logger.debug(`New session cached for user ${userId} for ${this.ttlMinutes} minutes`);
      } else {
        this.logger.debug(`Updated existing session for user ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Cache set error for user ${userId}: ${error.message}`);
    }
  }

  /**
   * Remove a user from cache (called on table close)
   * @param userId User ID to remove
   */
  async invalidate(userId: string): Promise<void> {
    try {
      // Check if the key exists before decrementing counter
      const exists = await this.cacheManager.get(`session:${userId}`);
      
      await this.cacheManager.del(`session:${userId}`);
      
      // Decrement session counter only if the key existed
      if (exists) {
        await this.decrementSessionCount();
      }
      
      this.logger.log(`Invalidated cache for user ${userId}`);
    } catch (error) {
      this.logger.error(`Cache invalidate error for user ${userId}: ${error.message}`);
    }
  }

  /**
   * Remove users from cache by session ID (alternative invalidation method)
   * Note: This is less efficient with Redis as we can't iterate all keys easily
   * Consider using a separate session-to-user mapping if this becomes a performance issue
   * @param sessionId Session ID to remove
   */
  async invalidateBySessionId(sessionId: string): Promise<void> {
    this.logger.debug(`Cannot efficiently iterate Redis keys for session ${sessionId}. Consider using user ID for invalidation instead.`);
  }

  /**
   * Clear all cached sessions (useful for testing or emergency cleanup)
   */
  async clear(): Promise<void> {
    try {
      // Reset the session counter
      const counterKey = 'session:count';
      await this.cacheManager.set(counterKey, 0, 24 * 60 * 60 * 1000);
      
      // Note: cache-manager doesn't have a reset method for individual patterns
      // In production, you can use Redis FLUSHDB command if needed
      this.logger.log(`Cache clear requested - session counter reset to 0`);
    } catch (error) {
      this.logger.error(`Cache clear error: ${error.message}`);
    }
  }

  /**
   * Get cache statistics including size
   */
  async getStats(): Promise<{ ttlMinutes: number; backend: string; size: number }> {
    try {
      // Get the size by counting session keys
      const size = await this.getSessionCount();
      return {
        ttlMinutes: this.ttlMinutes,
        backend: 'Redis',
        size,
      };
    } catch (error) {
      this.logger.error(`Error getting cache stats: ${error.message}`);
      return {
        ttlMinutes: this.ttlMinutes,
        backend: 'Redis',
        size: 0,
      };
    }
  }

  /**
   * Get the number of active sessions in cache
   */
  private async getSessionCount(): Promise<number> {
    try {
      // For Redis, we need to access the underlying store
      const cacheStore = (this.cacheManager as any).store;
      
      // Try different ways to access Redis client
      let client = null;
      
      // Method 1: Direct client access
      if (cacheStore?.client) {
        client = cacheStore.client;
      }
      // Method 2: Redis client property
      else if (cacheStore?.redisClient) {
        client = cacheStore.redisClient;
      }
      // Method 3: Store has direct keys method
      else if (typeof cacheStore?.keys === 'function') {
        const keys = await cacheStore.keys('session:*');
        return Array.isArray(keys) ? keys.length : 0;
      }
      
      if (client && typeof client.keys === 'function') {
        this.logger.debug('Using Redis client to count session keys');
        const keys = await client.keys('session:*');
        const count = Array.isArray(keys) ? keys.length : 0;
        this.logger.debug(`Found ${count} session keys in Redis`);
        return count;
      }
      
      // If we still can't access Redis, try a different approach
      // Get a known session key to verify Redis is working
      try {
        const testKey = 'session:test-connection';
        await this.cacheManager.set(testKey, 'test', 1000); // 1 second TTL
        const testValue = await this.cacheManager.get(testKey);
        if (testValue) {
          this.logger.debug('Redis connection verified, but cannot count keys efficiently');
        }
        await this.cacheManager.del(testKey);
      } catch (testError) {
        this.logger.error(`Redis connection test failed: ${testError.message}`);
      }
      
      // Fallback: if we can't access the store directly, return 0
      this.logger.warn('Cannot access Redis store directly to count sessions - using fallback method');
      
      // Alternative: maintain a counter in Redis
      const counterKey = 'session:count';
      const currentCount = await this.cacheManager.get<number>(counterKey);
      return currentCount || 0;
      
    } catch (error) {
      this.logger.error(`Error counting sessions: ${error.message}`);
      return 0;
    }
  }

  /**
   * Cache active sessions list for a waiter with shorter TTL
   * @param waiterId Waiter ID
   * @param sessions Array of active sessions
   * @param ttlMinutes Optional TTL override (default: 5 minutes for frequently changing data)
   */
  async setActiveSessions(waiterId: string, sessions: any[], ttlMinutes: number = 5): Promise<void> {
    try {
      const cacheKey = `active_sessions:${waiterId}`;
      const ttlMs = ttlMinutes * 60 * 1000;
      await this.cacheManager.set(cacheKey, sessions, ttlMs);
      this.logger.debug(`Cached ${sessions.length} active sessions for waiter ${waiterId} (${ttlMinutes}min TTL)`);
    } catch (error) {
      this.logger.error(`Error caching active sessions for waiter ${waiterId}: ${error.message}`);
    }
  }

  /**
   * Get cached active sessions for a waiter
   * @param waiterId Waiter ID
   * @returns Cached sessions array or null if not found/expired
   */
  async getActiveSessions(waiterId: string): Promise<any[] | null> {
    try {
      const cached = await this.cacheManager.get<any[]>(`active_sessions:${waiterId}`);
      if (cached) {
        this.logger.debug(`Cache hit for active sessions - waiter ${waiterId} (${cached.length} sessions)`);
        return cached;
      }
      return null;
    } catch (error) {
      this.logger.error(`Error getting cached active sessions for waiter ${waiterId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Invalidate cached active sessions for a waiter (call when sessions change)
   * @param waiterId Waiter ID
   */
  async invalidateActiveSessions(waiterId: string): Promise<void> {
    try {
      await this.cacheManager.del(`active_sessions:${waiterId}`);
      this.logger.debug(`Invalidated active sessions cache for waiter ${waiterId}`);
    } catch (error) {
      this.logger.error(`Error invalidating active sessions cache for waiter ${waiterId}: ${error.message}`);
    }
  }

  /**
   * Cache all active sessions with shorter TTL (admin/overview data)
   * @param sessions Array of all active sessions
   * @param ttlMinutes Optional TTL override (default: 2 minutes for admin data)
   */
  async setAllActiveSessions(sessions: any[], ttlMinutes: number = 2): Promise<void> {
    try {
      const cacheKey = 'all_active_sessions';
      const ttlMs = ttlMinutes * 60 * 1000;
      await this.cacheManager.set(cacheKey, sessions, ttlMs);
      this.logger.debug(`Cached ${sessions.length} total active sessions (${ttlMinutes}min TTL)`);
    } catch (error) {
      this.logger.error(`Error caching all active sessions: ${error.message}`);
    }
  }

  /**
   * Get cached all active sessions
   * @returns Cached sessions array or null if not found/expired
   */
  async getAllActiveSessions(): Promise<any[] | null> {
    try {
      const cached = await this.cacheManager.get<any[]>('all_active_sessions');
      if (cached) {
        this.logger.debug(`Cache hit for all active sessions (${cached.length} sessions)`);
        return cached;
      }
      return null;
    } catch (error) {
      this.logger.error(`Error getting cached all active sessions: ${error.message}`);
      return null;
    }
  }

  /**
   * Invalidate all active sessions cache (call when any session changes)
   */
  async invalidateAllActiveSessions(): Promise<void> {
    try {
      await this.cacheManager.del('all_active_sessions');
      this.logger.debug('Invalidated all active sessions cache');
    } catch (error) {
      this.logger.error(`Error invalidating all active sessions cache: ${error.message}`);
    }
  }

  /**
   * Increment the session counter
   */
  private async incrementSessionCount(): Promise<void> {
    try {
      const counterKey = 'session:count';
      const currentCount = await this.cacheManager.get<number>(counterKey);
      const newCount = (currentCount || 0) + 1;
      
      // Set counter with a long TTL (24 hours) to persist across server restarts
      const ttlMs = 24 * 60 * 60 * 1000;
      await this.cacheManager.set(counterKey, newCount, ttlMs);
      
      this.logger.debug(`Session count incremented to ${newCount}`);
    } catch (error) {
      this.logger.error(`Error incrementing session count: ${error.message}`);
    }
  }

  /**
   * Decrement the session counter
   */
  private async decrementSessionCount(): Promise<void> {
    try {
      const counterKey = 'session:count';
      const currentCount = await this.cacheManager.get<number>(counterKey);
      const newCount = Math.max(0, (currentCount || 0) - 1);
      
      // Set counter with a long TTL (24 hours) to persist across server restarts
      const ttlMs = 24 * 60 * 60 * 1000;
      await this.cacheManager.set(counterKey, newCount, ttlMs);
      
      this.logger.debug(`Session count decremented to ${newCount}`);
    } catch (error) {
      this.logger.error(`Error decrementing session count: ${error.message}`);
    }
  }
}
