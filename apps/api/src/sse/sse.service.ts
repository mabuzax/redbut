import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface NotificationEvent {
  sessionId?: string;
  waiterId?: string;
  type: 'request_update' | 'order_update' | 'session_transfer' | 'new_request' | 'new_order' | 'cache_refresh';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  requiresRefresh?: boolean; // Indicates if cache should be refreshed
}

export interface MessageEvent {
  data: string | object;
  id?: string;
  type?: string;
  retry?: number;
}

@Injectable()
export class SSEService {
  private readonly logger = new Logger(SSEService.name);
  private readonly eventSubject = new Subject<NotificationEvent>();
  private readonly activeConnections = new Map<string, Set<string>>(); // sessionId/waiterId -> Set of connectionIds

  /**
   * Create SSE event stream for a specific session (customers)
   */
  createSessionEventStream(sessionId: string, connectionId: string): Observable<MessageEvent> {
    this.logger.log(`Creating event stream for session: ${sessionId} (connection: ${connectionId})`);

    // Track connection
    if (!this.activeConnections.has(sessionId)) {
      this.activeConnections.set(sessionId, new Set());
    }
    this.activeConnections.get(sessionId)!.add(connectionId);

    return new Observable(observer => {
      // Send initial connection event
      observer.next({
        type: 'connection',
        data: {
          message: 'Connected to notifications',
          sessionId,
          connectionId,
          timestamp: new Date().toISOString(),
        },
        id: `conn-${Date.now()}`,
        retry: 3000,
      });

      // Subscribe to relevant events for this session
      const subscription = this.eventSubject
        .pipe(
          filter(event => event.sessionId === sessionId),
          map(event => {
            const messageEvent: MessageEvent = {
              type: event.type,
              data: {
                title: event.title,
                message: event.message,
                data: event.data,
                timestamp: event.timestamp.toISOString(),
                requiresRefresh: event.requiresRefresh || false,
              },
              id: `${event.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              retry: 3000,
            };

            this.logger.log(`Sending ${event.type} to session ${sessionId}:`, messageEvent.data);
            return messageEvent;
          })
        )
        .subscribe(
          messageEvent => {
            try {
              observer.next(messageEvent);
            } catch (error) {
              this.logger.error(`Error sending event to session ${sessionId}:`, error);
            }
          },
          error => {
            this.logger.error(`Stream error for session ${sessionId}:`, error);
            observer.error(error);
          }
        );

      // Cleanup on disconnect
      return () => {
        this.logger.log(`SSE stream closed for session: ${sessionId} (connection: ${connectionId})`);
        subscription.unsubscribe();
        
        // Remove connection tracking
        const connections = this.activeConnections.get(sessionId);
        if (connections) {
          connections.delete(connectionId);
          if (connections.size === 0) {
            this.activeConnections.delete(sessionId);
          }
        }
      };
    });
  }

  /**
   * Create SSE event stream for a specific waiter
   */
  createWaiterEventStream(waiterId: string, connectionId: string): Observable<MessageEvent> {
    this.logger.log(`Creating event stream for waiter: ${waiterId} (connection: ${connectionId})`);

    // Track connection
    const waiterKey = `waiter:${waiterId}`;
    if (!this.activeConnections.has(waiterKey)) {
      this.activeConnections.set(waiterKey, new Set());
    }
    this.activeConnections.get(waiterKey)!.add(connectionId);

    return new Observable(observer => {
      // Send initial connection event
      observer.next({
        type: 'connection',
        data: {
          message: 'Connected to waiter notifications',
          waiterId,
          connectionId,
          timestamp: new Date().toISOString(),
        },
        id: `conn-${Date.now()}`,
        retry: 3000,
      });

      // Subscribe to relevant events for this waiter
      const subscription = this.eventSubject
        .pipe(
          filter(event => event.waiterId === waiterId),
          map(event => {
            const messageEvent: MessageEvent = {
              type: event.type,
              data: {
                title: event.title,
                message: event.message,
                data: event.data,
                timestamp: event.timestamp.toISOString(),
                requiresRefresh: event.requiresRefresh || false,
              },
              id: `${event.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              retry: 3000,
            };

            this.logger.log(`Sending ${event.type} to waiter ${waiterId}:`, messageEvent.data);
            return messageEvent;
          })
        )
        .subscribe(
          messageEvent => {
            try {
              observer.next(messageEvent);
            } catch (error) {
              this.logger.error(`Error sending event to waiter ${waiterId}:`, error);
            }
          },
          error => {
            this.logger.error(`Stream error for waiter ${waiterId}:`, error);
            observer.error(error);
          }
        );

      // Cleanup on disconnect
      return () => {
        this.logger.log(`SSE stream closed for waiter: ${waiterId} (connection: ${connectionId})`);
        subscription.unsubscribe();
        
        // Remove connection tracking
        const connections = this.activeConnections.get(waiterKey);
        if (connections) {
          connections.delete(connectionId);
          if (connections.size === 0) {
            this.activeConnections.delete(waiterKey);
          }
        }
      };
    });
  }

  /**
   * Emit event to specific session with cache refresh capability
   */
  emitToSession(
    sessionId: string, 
    type: NotificationEvent['type'], 
    title: string, 
    message: string, 
    data?: any,
    requiresRefresh: boolean = false
  ) {
    const event: NotificationEvent = {
      sessionId,
      type,
      title,
      message,
      data,
      timestamp: new Date(),
      requiresRefresh,
    };

    this.eventSubject.next(event);
    this.logger.log(`Emitted ${type} to session ${sessionId}: ${title} (refresh: ${requiresRefresh})`);
  }

  /**
   * Emit event to specific waiter with cache refresh capability
   */
  emitToWaiter(
    waiterId: string, 
    type: NotificationEvent['type'], 
    title: string, 
    message: string, 
    data?: any,
    requiresRefresh: boolean = false
  ) {
    const event: NotificationEvent = {
      waiterId,
      type,
      title,
      message,
      data,
      timestamp: new Date(),
      requiresRefresh,
    };

    this.eventSubject.next(event);
    this.logger.log(`Emitted ${type} to waiter ${waiterId}: ${title} (refresh: ${requiresRefresh})`);
  }

  /**
   * Get active connection count for monitoring
   */
  getActiveConnectionsCount(): { sessions: number; waiters: number; total: number } {
    let sessionConnections = 0;
    let waiterConnections = 0;

    this.activeConnections.forEach((connections, key) => {
      if (key.startsWith('waiter:')) {
        waiterConnections += connections.size;
      } else {
        sessionConnections += connections.size;
      }
    });

    return {
      sessions: sessionConnections,
      waiters: waiterConnections,
      total: sessionConnections + waiterConnections,
    };
  }

  /**
   * Check if session has active connections
   */
  hasActiveSessionConnections(sessionId: string): boolean {
    const connections = this.activeConnections.get(sessionId);
    return connections ? connections.size > 0 : false;
  }

  /**
   * Check if waiter has active connections
   */
  hasActiveWaiterConnections(waiterId: string): boolean {
    const connections = this.activeConnections.get(`waiter:${waiterId}`);
    return connections ? connections.size > 0 : false;
  }

  /**
   * Send heartbeat to keep connections alive
   */
  sendHeartbeat() {
    const heartbeatEvent: NotificationEvent = {
      type: 'cache_refresh',
      title: 'Heartbeat',
      message: 'Connection alive',
      timestamp: new Date(),
      requiresRefresh: false,
    };

    // Send to all active connections
    this.eventSubject.next(heartbeatEvent);
    
    const stats = this.getActiveConnectionsCount();
    this.logger.debug(`Sent heartbeat to ${stats.total} active connections (${stats.sessions} sessions, ${stats.waiters} waiters)`);
  }
}