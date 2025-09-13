import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from './prisma.service';

/**
 * Performance monitoring service for session management
 * Tracks cache hit ratios, query performance, and system health
 */
@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);
  private metrics = {
    sessionCacheHits: 0,
    sessionCacheMisses: 0,
    activeSessionCacheHits: 0,
    activeSessionCacheMisses: 0,
    allSessionCacheHits: 0,
    allSessionCacheMisses: 0,
    dbQueryTimes: [] as number[],
  };

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Record a cache hit for individual sessions
   */
  recordSessionCacheHit() {
    this.metrics.sessionCacheHits++;
  }

  /**
   * Record a cache miss for individual sessions
   */
  recordSessionCacheMiss() {
    this.metrics.sessionCacheMisses++;
  }

  /**
   * Record a cache hit for active sessions list
   */
  recordActiveSessionCacheHit() {
    this.metrics.activeSessionCacheHits++;
  }

  /**
   * Record a cache miss for active sessions list
   */
  recordActiveSessionCacheMiss() {
    this.metrics.activeSessionCacheMisses++;
  }

  /**
   * Record a cache hit for all active sessions
   */
  recordAllSessionCacheHit() {
    this.metrics.allSessionCacheHits++;
  }

  /**
   * Record a cache miss for all active sessions
   */
  recordAllSessionCacheMiss() {
    this.metrics.allSessionCacheMisses++;
  }

  /**
   * Record database query execution time
   * @param durationMs Query duration in milliseconds
   */
  recordDbQueryTime(durationMs: number) {
    this.metrics.dbQueryTimes.push(durationMs);
    // Keep only last 1000 measurements to prevent memory leak
    if (this.metrics.dbQueryTimes.length > 1000) {
      this.metrics.dbQueryTimes = this.metrics.dbQueryTimes.slice(-1000);
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics() {
    const sessionCacheTotal = this.metrics.sessionCacheHits + this.metrics.sessionCacheMisses;
    const activeSessionCacheTotal = this.metrics.activeSessionCacheHits + this.metrics.activeSessionCacheMisses;
    const allSessionCacheTotal = this.metrics.allSessionCacheHits + this.metrics.allSessionCacheMisses;

    const avgQueryTime = this.metrics.dbQueryTimes.length > 0
      ? this.metrics.dbQueryTimes.reduce((a, b) => a + b, 0) / this.metrics.dbQueryTimes.length
      : 0;

    return {
      sessionCache: {
        hits: this.metrics.sessionCacheHits,
        misses: this.metrics.sessionCacheMisses,
        hitRatio: sessionCacheTotal > 0 ? (this.metrics.sessionCacheHits / sessionCacheTotal * 100).toFixed(1) + '%' : '0%',
      },
      activeSessionCache: {
        hits: this.metrics.activeSessionCacheHits,
        misses: this.metrics.activeSessionCacheMisses,
        hitRatio: activeSessionCacheTotal > 0 ? (this.metrics.activeSessionCacheHits / activeSessionCacheTotal * 100).toFixed(1) + '%' : '0%',
      },
      allSessionCache: {
        hits: this.metrics.allSessionCacheHits,
        misses: this.metrics.allSessionCacheMisses,
        hitRatio: allSessionCacheTotal > 0 ? (this.metrics.allSessionCacheHits / allSessionCacheTotal * 100).toFixed(1) + '%' : '0%',
      },
      database: {
        avgQueryTime: avgQueryTime.toFixed(2) + 'ms',
        queryCount: this.metrics.dbQueryTimes.length,
        recentQueries: this.metrics.dbQueryTimes.slice(-10), // Last 10 query times
      },
    };
  }

  /**
   * Get Redis cache statistics
   */
  async getRedisCacheStats() {
    try {
      // Get cache store to access Redis client
      const cacheStore = (this.cacheManager as any).store;
      
      if (cacheStore?.client) {
        const info = await cacheStore.client.info('memory');
        const keyspace = await cacheStore.client.info('keyspace');
        
        return {
          memory: this.parseRedisInfo(info),
          keyspace: this.parseRedisInfo(keyspace),
        };
      }
      
      return { error: 'Cannot access Redis client for statistics' };
    } catch (error) {
      this.logger.error(`Error getting Redis stats: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Get database performance statistics
   */
  async getDatabaseStats() {
    try {
      const startTime = Date.now();
      
      // Test query performance
      const activeSessionCount = await this.prisma.user.count({
        where: {
          sessionId: { not: { startsWith: 'CLOSED_' } }
        }
      });
      
      const queryTime = Date.now() - startTime;
      this.recordDbQueryTime(queryTime);

      // Get table sizes
      const tableSizes = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE tablename = 'users'
        ORDER BY n_distinct DESC;
      `;

      return {
        activeSessionCount,
        lastQueryTime: queryTime + 'ms',
        tableSizes,
      };
    } catch (error) {
      this.logger.error(`Error getting database stats: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Generate performance report
   */
  async getPerformanceReport() {
    const metrics = this.getMetrics();
    const redisStats = await this.getRedisCacheStats();
    const dbStats = await this.getDatabaseStats();

    return {
      timestamp: new Date().toISOString(),
      cacheMetrics: metrics,
      redis: redisStats,
      database: dbStats,
      recommendations: this.generateRecommendations(metrics),
    };
  }

  /**
   * Reset metrics (useful for testing or periodic reset)
   */
  resetMetrics() {
    this.metrics = {
      sessionCacheHits: 0,
      sessionCacheMisses: 0,
      activeSessionCacheHits: 0,
      activeSessionCacheMisses: 0,
      allSessionCacheHits: 0,
      allSessionCacheMisses: 0,
      dbQueryTimes: [],
    };
    this.logger.log('Performance metrics reset');
  }

  /**
   * Parse Redis INFO command output
   */
  private parseRedisInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Generate performance recommendations based on metrics
   */
  private generateRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];
    
    // Session cache recommendations
    const sessionHitRate = parseFloat(metrics.sessionCache.hitRatio);
    if (sessionHitRate < 70) {
      recommendations.push('Session cache hit rate is low. Consider increasing TTL or investigating cache invalidation patterns.');
    }

    // Active session cache recommendations
    const activeSessionHitRate = parseFloat(metrics.activeSessionCache.hitRatio);
    if (activeSessionHitRate < 60) {
      recommendations.push('Active session cache hit rate is low. Consider optimizing query frequency or increasing TTL.');
    }

    // Database performance recommendations
    const avgQueryTime = parseFloat(metrics.database.avgQueryTime);
    if (avgQueryTime > 100) {
      recommendations.push('Average database query time is high. Check index usage and query optimization.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance metrics look good! Continue monitoring.');
    }

    return recommendations;
  }
}
