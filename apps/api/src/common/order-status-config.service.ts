import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrderStatusConfigService {
  private readonly logger = new Logger(OrderStatusConfigService.name);
  /* Using in-memory cache instead of Redis */  
  private readonly cache = new Map<string, string>();
  private readonly cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds
  private readonly CACHE_KEY_PREFIX = 'order_status_config:';

  constructor(private readonly prisma: PrismaService) {
    this.logger.log('OrderStatusConfigService initialized with in-memory cache');
  }

  /**
   * Get allowed transitions for a specific status and user role
   */
  async getAllowedTransitions(
    currentStatus: OrderStatus,
    userRole: string,
  ): Promise<{ targetStatus: OrderStatus; label: string }[]> {
    return this.getDefaultTransitions(currentStatus, userRole);
  }

  /**
   * Get default transitions when database fails or no config exists
   */
  private getDefaultTransitions(
    currentStatus: OrderStatus, 
    userRole: string
  ): { targetStatus: OrderStatus; label: string }[] {
    // Default transitions based on role and current status
    if (userRole === 'client') {
      switch (currentStatus) {
        case 'New':
          return [
            { targetStatus: 'New' as OrderStatus, label: 'New' },
            { targetStatus: 'Cancelled' as OrderStatus, label: 'Cancel' },
          ];
        case 'Acknowledged':
          return [
            { targetStatus: 'Acknowledged' as OrderStatus, label: 'Acknowledged' },
            { targetStatus: 'Cancelled' as OrderStatus, label: 'Cancel' },
          ];
        case 'InProgress':
          return [
            { targetStatus: 'InProgress' as OrderStatus, label: 'In Progress' },
          ];
        case 'Complete':
          return [
            { targetStatus: 'Complete' as OrderStatus, label: 'Completed' },
          ];
        case 'Delivered':
          return [
            { targetStatus: 'Delivered' as OrderStatus, label: 'Delivered' },
            { targetStatus: 'Rejected' as OrderStatus, label: 'Reject' },
          ];
        case 'Paid':
          return [
            { targetStatus: 'Paid' as OrderStatus, label: 'Paid' },
          ];
        case 'Cancelled':
          return [
            { targetStatus: 'Cancelled' as OrderStatus, label: 'Cancelled' },
          ];
        case 'Rejected':
          return [
            { targetStatus: 'Rejected' as OrderStatus, label: 'Rejected' },
          ];
        default:
          return [{ targetStatus: currentStatus, label: this.formatStatusLabel(currentStatus) }];
      }
    } else if (userRole === 'waiter') {
      switch (currentStatus) {
        case 'New':
          return [
            { targetStatus: 'New' as OrderStatus, label: 'New' },
            { targetStatus: 'Acknowledged' as OrderStatus, label: 'Acknowledge' },
            { targetStatus: 'InProgress' as OrderStatus, label: 'In Progress' },
            { targetStatus: 'Cancelled' as OrderStatus, label: 'Cancel' },
          ];
        case 'Acknowledged':
          return [
            { targetStatus: 'Acknowledged' as OrderStatus, label: 'Acknowledged' },
            { targetStatus: 'InProgress' as OrderStatus, label: 'In Progress' },
            { targetStatus: 'Cancelled' as OrderStatus, label: 'Cancel' },
          ];
        case 'InProgress':
          return [
            { targetStatus: 'InProgress' as OrderStatus, label: 'In Progress' },
            { targetStatus: 'Complete' as OrderStatus, label: 'Mark Complete' },
            { targetStatus: 'Cancelled' as OrderStatus, label: 'Cancel' },
          ];
        case 'Complete':
          return [
            { targetStatus: 'Complete' as OrderStatus, label: 'Completed' },
            { targetStatus: 'InProgress' as OrderStatus, label: 'In Progress' },
            { targetStatus: 'Delivered' as OrderStatus, label: 'Delivered' },
          ];
        case 'Delivered':
          return [            
            { targetStatus: 'Delivered' as OrderStatus, label: 'Delivered' },
            { targetStatus: 'InProgress' as OrderStatus, label: 'In Progress' },
            { targetStatus: 'Paid' as OrderStatus, label: 'Mark Paid' },
          ];
        case 'Paid':
          return [
            { targetStatus: 'Paid' as OrderStatus, label: 'Paid' },
          ];
        case 'Cancelled':
          return [
            { targetStatus: 'Cancelled' as OrderStatus, label: 'Cancelled' },
          ];
        case 'Rejected':
          return [
            { targetStatus: 'Rejected' as OrderStatus, label: 'Rejected' },
            { targetStatus: 'InProgress' as OrderStatus, label: 'In Progress' },
            { targetStatus: 'Delivered' as OrderStatus, label: 'Delivered' },
            { targetStatus: 'Cancelled' as OrderStatus, label: 'Cancelled' }
          ];
        default:
          return [{ targetStatus: currentStatus, label: this.formatStatusLabel(currentStatus) }];
      }
    } else {
      // Admin/manager gets all possible transitions
      return Object.values(OrderStatus).map(status => ({
        targetStatus: status,
        label: this.formatStatusLabel(status),
      }));
    }
  }

  /**
   * Validate if a transition is allowed for the given status and user role
   */
  async validateTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
    userRole: string,
  ): Promise<boolean> {
    // If no status change, always valid
    if (currentStatus === newStatus) {
      return true;
    }

    try {
      const allowedTransitions = this.getDefaultTransitions(currentStatus, userRole)
      
      const transitions = allowedTransitions || [];      
      const isAllowed = transitions.some(
        (transition) => transition.targetStatus === newStatus,
      );
      
      if (!isAllowed) {
        const allowedStatusList = transitions
          .map((t) => t.label)
          .join(', ');
          
        throw new BadRequestException(
          `The order cannot be changed to "${newStatus}" from its current status. Available options: ${allowedStatusList || 'None'}`
        );
      }
      
      return true;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // For other errors, provide a user-friendly message
      throw new BadRequestException(
        `Unable to update order status at this time. Please try again later.`
      );
    }
  }

  /**
   * Get the display label for a specific status transition
   */
  async getTransitionLabel(
    currentStatus: OrderStatus,
    targetStatus: OrderStatus,
    userRole: string,
  ): Promise<string> {
    try {
      const transitions = await this.getAllowedTransitions(currentStatus, userRole);
      const transition = transitions.find(t => t.targetStatus === targetStatus);
      return transition?.label || this.formatStatusLabel(targetStatus);
    } catch (error) {
      return this.formatStatusLabel(targetStatus);
    }
  }

  /**
   * Format status for display if no label is found
   */
  private formatStatusLabel(status: OrderStatus): string {
    switch (status) {
      case 'InProgress':
        return 'In Progress';
      case 'Complete':
        return 'Completed';
      default:
        return String(status);
    }
  }


}
