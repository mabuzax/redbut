import { Injectable, Logger } from '@nestjs/common';
import { RequestStatus, OrderStatus } from '@prisma/client';
import { NotificationService } from './notification.service';

export interface CacheRefreshEvent {
  type: 'reviews' | 'requests' | 'orders' | 'sessions' | 'analytics' | 'all';
  sessionId?: string;
  waiterId?: string;
  affectedIds?: string[];
  reason: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high';
}

@Injectable()
export class CacheRefreshService {
  private readonly logger = new Logger(CacheRefreshService.name);
  private readonly pendingRefreshes = new Map<string, CacheRefreshEvent[]>();
  private readonly refreshTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Trigger cache refresh for session analytics
   */
  triggerSessionAnalyticsRefresh(data: {
    sessionId: string;
    waiterId?: string;
    reason: string;
    priority?: 'low' | 'medium' | 'high';
  }): void {
    const event: CacheRefreshEvent = {
      type: 'analytics',
      sessionId: data.sessionId,
      waiterId: data.waiterId,
      reason: data.reason,
      timestamp: new Date(),
      priority: data.priority || 'medium',
    };

    this.logger.log(`Triggering session analytics refresh: ${data.sessionId} - ${data.reason}`);
    
    this.addPendingRefresh(data.sessionId, event);
    this.scheduleRefresh(data.sessionId, 1000); // 1 second debounce
  }

  /**
   * Trigger cache refresh for waiter analytics
   */
  triggerWaiterAnalyticsRefresh(data: {
    waiterId: string;
    sessionId?: string;
    reason: string;
    priority?: 'low' | 'medium' | 'high';
  }): void {
    const event: CacheRefreshEvent = {
      type: 'analytics',
      waiterId: data.waiterId,
      sessionId: data.sessionId,
      reason: data.reason,
      timestamp: new Date(),
      priority: data.priority || 'medium',
    };

    this.logger.log(`Triggering waiter analytics refresh: ${data.waiterId} - ${data.reason}`);
    
    this.addPendingRefresh(`waiter:${data.waiterId}`, event);
    this.scheduleRefresh(`waiter:${data.waiterId}`, 1000); // 1 second debounce
  }

  /**
   * Trigger cache refresh for reviews data
   */
  triggerReviewsRefresh(data: {
    sessionId?: string;
    waiterId?: string;
    reviewIds?: string[];
    reason: string;
    priority?: 'low' | 'medium' | 'high';
  }): void {
    const event: CacheRefreshEvent = {
      type: 'reviews',
      sessionId: data.sessionId,
      waiterId: data.waiterId,
      affectedIds: data.reviewIds,
      reason: data.reason,
      timestamp: new Date(),
      priority: data.priority || 'medium',
    };

    this.logger.log(`Triggering reviews refresh - ${data.reason}`);
    
    if (data.sessionId) {
      this.addPendingRefresh(data.sessionId, event);
      this.scheduleRefresh(data.sessionId, 500); // Faster for reviews
    }
    
    if (data.waiterId) {
      this.addPendingRefresh(`waiter:${data.waiterId}`, event);
      this.scheduleRefresh(`waiter:${data.waiterId}`, 500);
    }
  }

  /**
   * Trigger cache refresh for requests data
   */
  triggerRequestsRefresh(data: {
    sessionId: string;
    waiterId: string;
    requestIds?: string[];
    reason: string;
    priority?: 'low' | 'medium' | 'high';
  }): void {
    const event: CacheRefreshEvent = {
      type: 'requests',
      sessionId: data.sessionId,
      waiterId: data.waiterId,
      affectedIds: data.requestIds,
      reason: data.reason,
      timestamp: new Date(),
      priority: data.priority || 'high', // Requests are high priority
    };

    this.logger.log(`Triggering requests refresh: ${data.sessionId} - ${data.reason}`);
    
    this.addPendingRefresh(data.sessionId, event);
    this.addPendingRefresh(`waiter:${data.waiterId}`, event);
    
    // Immediate refresh for high priority requests
    this.scheduleRefresh(data.sessionId, 200);
    this.scheduleRefresh(`waiter:${data.waiterId}`, 200);
  }

  /**
   * Trigger cache refresh for orders data
   */
  triggerOrdersRefresh(data: {
    sessionId: string;
    waiterId: string;
    orderIds?: string[];
    reason: string;
    priority?: 'low' | 'medium' | 'high';
  }): void {
    const event: CacheRefreshEvent = {
      type: 'orders',
      sessionId: data.sessionId,
      waiterId: data.waiterId,
      affectedIds: data.orderIds,
      reason: data.reason,
      timestamp: new Date(),
      priority: data.priority || 'high', // Orders are high priority
    };

    this.logger.log(`Triggering orders refresh: ${data.sessionId} - ${data.reason}`);
    
    this.addPendingRefresh(data.sessionId, event);
    this.addPendingRefresh(`waiter:${data.waiterId}`, event);
    
    // Immediate refresh for high priority orders
    this.scheduleRefresh(data.sessionId, 200);
    this.scheduleRefresh(`waiter:${data.waiterId}`, 200);
  }

  /**
   * Trigger cache refresh for session transfers
   */
  triggerSessionTransferRefresh(data: {
    sessionId: string;
    previousWaiterId?: string;
    newWaiterId: string;
    reason: string;
  }): void {
    const event: CacheRefreshEvent = {
      type: 'sessions',
      sessionId: data.sessionId,
      waiterId: data.newWaiterId,
      reason: data.reason,
      timestamp: new Date(),
      priority: 'high', // Session transfers are critical
    };

    this.logger.log(`Triggering session transfer refresh: ${data.sessionId} -> ${data.newWaiterId}`);
    
    // Refresh for session
    this.addPendingRefresh(data.sessionId, event);
    this.scheduleRefresh(data.sessionId, 100); // Immediate for transfers
    
    // Refresh for new waiter
    this.addPendingRefresh(`waiter:${data.newWaiterId}`, event);
    this.scheduleRefresh(`waiter:${data.newWaiterId}`, 100);
    
    // Refresh for previous waiter if exists
    if (data.previousWaiterId) {
      this.addPendingRefresh(`waiter:${data.previousWaiterId}`, event);
      this.scheduleRefresh(`waiter:${data.previousWaiterId}`, 100);
    }
  }

  /**
   * Force immediate refresh for critical updates
   */
  forceImmediateRefresh(data: {
    sessionId?: string;
    waiterId?: string;
    reason: string;
    affectedData: string[];
  }): void {
    this.logger.log(`Forcing immediate refresh - ${data.reason}`);
    
    if (data.sessionId) {
      this.executeRefresh(data.sessionId);
    }
    
    if (data.waiterId) {
      this.executeRefresh(`waiter:${data.waiterId}`);
    }

    // Send notification without debouncing
    this.notificationService.notifyCacheRefresh({
      sessionId: data.sessionId,
      waiterId: data.waiterId,
      reason: data.reason,
      affectedData: data.affectedData,
      metadata: {
        immediate: true,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Get cache refresh statistics
   */
  getRefreshStats(): {
    pendingRefreshes: number;
    activeTimers: number;
    recentEvents: { key: string; eventCount: number; lastRefresh?: Date }[];
  } {
    const recentEvents = Array.from(this.pendingRefreshes.entries()).map(([key, events]) => ({
      key,
      eventCount: events.length,
      lastRefresh: events.length > 0 ? events[events.length - 1].timestamp : undefined,
    }));

    return {
      pendingRefreshes: Array.from(this.pendingRefreshes.values()).reduce((sum, events) => sum + events.length, 0),
      activeTimers: this.refreshTimers.size,
      recentEvents,
    };
  }

  /**
   * Add pending refresh event with deduplication
   */
  private addPendingRefresh(key: string, event: CacheRefreshEvent): void {
    if (!this.pendingRefreshes.has(key)) {
      this.pendingRefreshes.set(key, []);
    }
    
    const events = this.pendingRefreshes.get(key)!;
    
    // Deduplicate similar events (same type and reason within last 5 seconds)
    const now = new Date();
    const existingEvent = events.find(e => 
      e.type === event.type && 
      e.reason === event.reason &&
      (now.getTime() - e.timestamp.getTime()) < 5000
    );
    
    if (!existingEvent) {
      events.push(event);
      this.logger.debug(`Added pending refresh for ${key}: ${event.type} - ${event.reason}`);
    } else {
      this.logger.debug(`Deduplicated refresh for ${key}: ${event.type} - ${event.reason}`);
    }
  }

  /**
   * Schedule refresh with debouncing
   */
  private scheduleRefresh(key: string, delayMs: number): void {
    // Clear existing timer
    if (this.refreshTimers.has(key)) {
      clearTimeout(this.refreshTimers.get(key)!);
    }
    
    // Schedule new refresh
    const timer = setTimeout(() => {
      this.executeRefresh(key);
    }, delayMs);
    
    this.refreshTimers.set(key, timer);
    this.logger.debug(`Scheduled refresh for ${key} in ${delayMs}ms`);
  }

  /**
   * Execute the actual refresh and send notifications
   */
  private executeRefresh(key: string): void {
    const events = this.pendingRefreshes.get(key);
    if (!events || events.length === 0) {
      return;
    }

    this.logger.log(`Executing cache refresh for ${key} (${events.length} events)`);
    
    // Group events by type for efficient processing
    const eventsByType = events.reduce((groups, event) => {
      if (!groups[event.type]) {
        groups[event.type] = [];
      }
      groups[event.type].push(event);
      return groups;
    }, {} as Record<string, CacheRefreshEvent[]>);

    // Determine the highest priority
    const highestPriority = events.reduce((highest, event) => {
      const priorities = { low: 1, medium: 2, high: 3 };
      return priorities[event.priority] > priorities[highest] ? event.priority : highest;
    }, 'low' as 'low' | 'medium' | 'high');

    // Create comprehensive refresh message
    const affectedTypes = Object.keys(eventsByType);
    const reasons = [...new Set(events.map(e => e.reason))];
    const message = `Cache refresh required: ${reasons.join(', ')}`;

    // Extract session/waiter info from key
    const isWaiterKey = key.startsWith('waiter:');
    const sessionId = !isWaiterKey ? key : events.find(e => e.sessionId)?.sessionId;
    const waiterId = isWaiterKey ? key.replace('waiter:', '') : events.find(e => e.waiterId)?.waiterId;

    // Send notification
    this.notificationService.notifyCacheRefresh({
      sessionId,
      waiterId,
      reason: message,
      affectedData: affectedTypes,
      metadata: {
        eventCount: events.length,
        priority: highestPriority,
        affectedTypes,
        reasons,
        timestamp: new Date().toISOString(),
      },
    });

    // Clear processed events
    this.pendingRefreshes.delete(key);
    this.refreshTimers.delete(key);
    
    this.logger.debug(`Cache refresh completed for ${key}`, {
      eventCount: events.length,
      affectedTypes,
      priority: highestPriority,
    });
  }
}