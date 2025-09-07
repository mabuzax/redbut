import { Injectable, Logger } from '@nestjs/common';

interface CacheItem {
  data: any;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private cache = new Map<string, CacheItem>();
  private readonly TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

  set(key: string, data: any): void {
    const expiresAt = Date.now() + this.TTL;
    this.cache.set(key, { data, expiresAt });
    this.logger.log(`Cache set for key: ${key}, expires at: ${new Date(expiresAt).toISOString()}`);
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.logger.log(`Cache expired and removed for key: ${key}`);
      return null;
    }

    this.logger.log(`Cache hit for key: ${key}`);
    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.logger.log(`Cache deleted for key: ${key}`);
  }

  clear(): void {
    this.cache.clear();
    this.logger.log('Cache cleared');
  }

  // Cleanup expired entries periodically
  cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      this.logger.log(`Cleaned up ${deletedCount} expired cache entries`);
    }
  }

  // Get cache statistics
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Get admin-specific cache statistics
  getAdminStats(adminSessionId: string): { size: number; keys: string[] } {
    const allStats = this.getStats();
    const adminKeys = allStats.keys.filter(key => key.includes(adminSessionId));
    
    return {
      size: adminKeys.length,
      keys: adminKeys
    };
  }
}
