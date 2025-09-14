import { Injectable, Logger } from '@nestjs/common';
import { RequestStatus, OrderStatus } from '@prisma/client';
import { SSEService } from './sse.service';

export interface NotificationEventData {
  type: 'request_update' | 'order_update' | 'session_transfer' | 'waiter_assigned' | 'cache_refresh';
  sessionId?: string;
  waiterId?: string;
  orderId?: string;
  requestId?: string;
  tableNumber?: number;
  status?: string;
  previousStatus?: string;
  timestamp: string;
  message: string;
  requiresRefresh?: boolean;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly sseService: SSEService) {}

  /**
   * Notify about request status updates
   */
  notifyRequestUpdate(data: {
    sessionId: string;
    waiterId: string;
    requestId: string;
    tableNumber: number;
    status: RequestStatus;
    previousStatus?: RequestStatus;
    requestType?: string;
    metadata?: Record<string, any>;
  }): void {
    const message = this.generateRequestUpdateMessage(data);
    const metadata = {
      requestId: data.requestId,
      requestType: data.requestType,
      status: data.status,
      previousStatus: data.previousStatus,
      tableNumber: data.tableNumber,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    };

    this.logger.log(`Notifying request update: ${data.requestId} -> ${data.status}`);
    
    // Emit to session (customer)
    this.sseService.emitToSession(
      data.sessionId, 
      'request_update', 
      'Request Update',
      message,
      metadata,
      true // requiresRefresh
    );
    
    // Emit to waiter
    this.sseService.emitToWaiter(
      data.waiterId, 
      'request_update', 
      'Request Update',
      message,
      metadata,
      true // requiresRefresh
    );

    this.logger.debug(`Request update notification sent`, { 
      sessionId: data.sessionId, 
      waiterId: data.waiterId,
      requestId: data.requestId,
      status: data.status 
    });
  }

  /**
   * Notify about order status updates
   */
  notifyOrderUpdate(data: {
    sessionId: string;
    waiterId: string;
    orderId: string;
    tableNumber: number;
    status: OrderStatus;
    previousStatus?: OrderStatus;
    totalAmount?: number;
    itemCount?: number;
    metadata?: Record<string, any>;
  }): void {
    const message = this.generateOrderUpdateMessage(data);
    const metadata = {
      orderId: data.orderId,
      status: data.status,
      previousStatus: data.previousStatus,
      tableNumber: data.tableNumber,
      totalAmount: data.totalAmount,
      itemCount: data.itemCount,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    };

    this.logger.log(`Notifying order update: ${data.orderId} -> ${data.status}`);
    
    // Emit to session (customer)
    this.sseService.emitToSession(
      data.sessionId, 
      'order_update', 
      'Order Update',
      message,
      metadata,
      true // requiresRefresh
    );
    
    // Emit to waiter
    this.sseService.emitToWaiter(
      data.waiterId, 
      'order_update', 
      'Order Update',
      message,
      metadata,
      true // requiresRefresh
    );

    this.logger.debug(`Order update notification sent`, { 
      sessionId: data.sessionId, 
      waiterId: data.waiterId,
      orderId: data.orderId,
      status: data.status 
    });
  }

  /**
   * Notify about session transfers (waiter changes)
   */
  notifySessionTransfer(data: {
    sessionId: string;
    previousWaiterId?: string;
    newWaiterId: string;
    tableNumber: number;
    transferReason?: string;
    metadata?: Record<string, any>;
  }): void {
    const message = this.generateSessionTransferMessage(data);
    const metadata = {
      previousWaiterId: data.previousWaiterId,
      newWaiterId: data.newWaiterId,
      transferReason: data.transferReason,
      tableNumber: data.tableNumber,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    };

    this.logger.log(`Notifying session transfer: ${data.sessionId} -> waiter ${data.newWaiterId}`);
    
    // Emit to session (customer)
    this.sseService.emitToSession(
      data.sessionId, 
      'session_transfer', 
      'Waiter Change',
      message,
      metadata,
      true // requiresRefresh
    );
    
    // Emit to new waiter
    this.sseService.emitToWaiter(
      data.newWaiterId, 
      'session_transfer', 
      'Session Transfer',
      message,
      metadata,
      true // requiresRefresh
    );
    
    // Emit to previous waiter if exists
    if (data.previousWaiterId) {
      this.sseService.emitToWaiter(
        data.previousWaiterId, 
        'session_transfer', 
        'Session Transfer',
        message,
        metadata,
        true // requiresRefresh
      );
    }

    this.logger.debug(`Session transfer notification sent`, { 
      sessionId: data.sessionId, 
      previousWaiterId: data.previousWaiterId,
      newWaiterId: data.newWaiterId 
    });
  }

  /**
   * Notify about waiter assignments
   */
  notifyWaiterAssigned(data: {
    sessionId: string;
    waiterId: string;
    tableNumber: number;
    waiterName?: string;
    metadata?: Record<string, any>;
  }): void {
    const message = this.generateWaiterAssignedMessage(data);
    const metadata = {
      waiterId: data.waiterId,
      waiterName: data.waiterName,
      tableNumber: data.tableNumber,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    };

    this.logger.log(`Notifying waiter assignment: ${data.waiterId} -> session ${data.sessionId}`);
    
    // Emit to session (customer)
    this.sseService.emitToSession(
      data.sessionId, 
      'new_request', // Use supported type for waiter assignments
      'Waiter Assigned',
      message,
      metadata,
      false // Initial assignment doesn't require cache refresh
    );
    
    // Emit to waiter
    this.sseService.emitToWaiter(
      data.waiterId, 
      'new_request', // Use supported type for waiter assignments
      'New Assignment',
      message,
      metadata,
      false // Initial assignment doesn't require cache refresh
    );

    this.logger.debug(`Waiter assignment notification sent`, { 
      sessionId: data.sessionId, 
      waiterId: data.waiterId 
    });
  }

  /**
   * Force cache refresh notification
   */
  notifyCacheRefresh(data: {
    sessionId?: string;
    waiterId?: string;
    reason: string;
    affectedData: string[];
    metadata?: Record<string, any>;
  }): void {
    const message = `Cache refresh required: ${data.reason}`;
    const metadata = {
      reason: data.reason,
      affectedData: data.affectedData,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    };

    this.logger.log(`Notifying cache refresh: ${data.reason}`);
    
    if (data.sessionId) {
      this.sseService.emitToSession(
        data.sessionId, 
        'cache_refresh', 
        'Data Update',
        message,
        metadata,
        true // requiresRefresh
      );
    }
    
    if (data.waiterId) {
      this.sseService.emitToWaiter(
        data.waiterId, 
        'cache_refresh', 
        'Data Update',
        message,
        metadata,
        true // requiresRefresh
      );
    }

    this.logger.debug(`Cache refresh notification sent`, { 
      sessionId: data.sessionId, 
      waiterId: data.waiterId,
      reason: data.reason 
    });
  }

  /**
   * Generate user-friendly message for request updates
   */
  private generateRequestUpdateMessage(data: {
    status: RequestStatus;
    requestType?: string;
    tableNumber: number;
  }): string {

    
    const requestTypeText = data.requestType ? ` ${data.requestType}` : '';

    const statusMessages: Record<RequestStatus, string> = {
      [RequestStatus.New]: `Item '${requestTypeText}' received`,
      [RequestStatus.Acknowledged]: `Waiter acknowledged your request: ${requestTypeText}`,
      [RequestStatus.InProgress]: `Item '${requestTypeText}' has moved to In Progress.`,
      [RequestStatus.Completed]: `Item '${requestTypeText}' has been completed.`,
      [RequestStatus.OnHold]: `Item '${requestTypeText}' has been temporarily placed on hold.`,
      [RequestStatus.Cancelled]: `Item '${requestTypeText}' has been cancelled.`,
      [RequestStatus.Done]: `Item '${requestTypeText}' is completed.`,
    };

    const baseMessage = statusMessages[data.status] || `Your request status: ${data.status}`;

    return `${baseMessage}`;
  }

  /**
   * Generate user-friendly message for order updates
   */
  private generateOrderUpdateMessage(data: {
    status: OrderStatus;
    itemCount?: number;
    tableNumber: number;
  }): string {
    const statusMessages: Record<OrderStatus, string> = {
      [OrderStatus.New]: 'Your order has been received',
      [OrderStatus.Acknowledged]: 'Your order has been acknowledged and is being prepared',
      [OrderStatus.InProgress]: 'Your order is being prepared in the kitchen',
      [OrderStatus.Complete]: 'Your order has been completed',
      [OrderStatus.Delivered]: 'Your order has been delivered to your table',
      [OrderStatus.Paid]: 'Your order has been paid and is complete',
      [OrderStatus.Cancelled]: 'Your order has been cancelled',
      [OrderStatus.Rejected]: 'Unfortunately, your order could not be fulfilled',
    };

    const baseMessage = statusMessages[data.status] || `Your order status: ${data.status}`;
    const itemText = data.itemCount ? ` (${data.itemCount} items)` : '';
    
    return `${baseMessage}${itemText} - Table ${data.tableNumber}`;
  }

  /**
   * Generate user-friendly message for session transfers
   */
  private generateSessionTransferMessage(data: {
    transferReason?: string;
    tableNumber: number;
  }): string {
    const reasonText = data.transferReason ? ` (${data.transferReason})` : '';
    return `Your waiter has been updated${reasonText} - Table ${data.tableNumber}`;
  }

  /**
   * Generate user-friendly message for waiter assignments
   */
  private generateWaiterAssignedMessage(data: {
    waiterName?: string;
    tableNumber: number;
  }): string {
    const waiterText = data.waiterName ? data.waiterName : 'your waiter';
    return `${waiterText} has been assigned to your table - Table ${data.tableNumber}`;
  }
}