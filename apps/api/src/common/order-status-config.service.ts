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
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}${currentStatus}:${userRole}`;
      
      const now = Math.floor(Date.now() / 1000);
      const cachedData = this.cache.get(cacheKey);

      if (cachedData && (this.cacheExpiry.get(cacheKey) ?? 0) > now) {
        this.logger.debug(`Cache hit for ${cacheKey}`);
        return JSON.parse(cachedData);
      }
      
      this.logger.debug(`Cache miss for ${cacheKey}, fetching from database`);
      
      try {
        // Fetch from database if not in cache
        const transitions = await (this.prisma as any).orderStatusConfig.findMany({
          where: {
            currentStatus,
            userRole,
          },
          select: {
            targetStatus: true,
            label: true,
          },
          orderBy: {
            label: 'asc',
          },
        });
        
        // If no transitions found, return default transitions based on status and role
        if (transitions.length === 0) {
          this.logger.warn(`No transitions found for ${currentStatus}:${userRole}, using defaults`);
          const defaultTransitions = this.getDefaultTransitions(currentStatus, userRole);
          
          // Store defaults in cache
          this.cache.set(cacheKey, JSON.stringify(defaultTransitions));
          this.cacheExpiry.set(cacheKey, now + this.CACHE_TTL);
          
          return defaultTransitions;
        }
        
        // Store in memory with TTL
        this.cache.set(cacheKey, JSON.stringify(transitions));
        this.cacheExpiry.set(cacheKey, now + this.CACHE_TTL);
        
        return transitions;
      } catch (dbError) {
        this.logger.error(`Database error: ${dbError.message}. Using default transitions.`);
        
        // If database error (like table not existing), return default transitions
        const defaultTransitions = this.getDefaultTransitions(currentStatus, userRole);
        
        // Store defaults in cache to avoid repeated DB errors
        this.cache.set(cacheKey, JSON.stringify(defaultTransitions));
        this.cacheExpiry.set(cacheKey, now + this.CACHE_TTL);
        
        return defaultTransitions;
      }
    } catch (error) {
      this.logger.error(`Error fetching allowed transitions: ${error.message}`);
      // Return default transitions as fallback
      return this.getDefaultTransitions(currentStatus, userRole);
    }
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
        case 'Delivered':
          return [
            { targetStatus: 'Delivered' as OrderStatus, label: 'Delivered' },
            { targetStatus: 'Cancelled' as OrderStatus, label: 'Reject' },
          ];
        default:
          return [{ targetStatus: currentStatus, label: String(currentStatus) }];
      }
    } else if (userRole === 'waiter') {
      switch (currentStatus) {
        case 'New':
          return [
            { targetStatus: 'New' as OrderStatus, label: 'New' },
            { targetStatus: 'Acknowledged' as OrderStatus, label: 'Acknowledge' },
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
            { targetStatus: 'Complete' as OrderStatus, label: 'Complete' },
            { targetStatus: 'Cancelled' as OrderStatus, label: 'Cancel' },
          ];
        case 'Complete':
          return [
            { targetStatus: 'Complete' as OrderStatus, label: 'Complete' },
            { targetStatus: 'Delivered' as OrderStatus, label: 'Delivered' },
          ];
        case 'Delivered':
          return [
            { targetStatus: 'Delivered' as OrderStatus, label: 'Delivered' },
            { targetStatus: 'Paid' as OrderStatus, label: 'Paid' },
          ];
        default:
          return [{ targetStatus: currentStatus, label: String(currentStatus) }];
      }
    } else {
      // Admin/manager gets all possible transitions
      return Object.values(OrderStatus).map(status => ({
        targetStatus: status,
        label: status === 'InProgress' ? 'In Progress' : status,
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
      const allowedTransitions = await this.getAllowedTransitions(
        currentStatus,
        userRole,
      );

      /* ------------------------------------------------------------------ */
      /* If the DB is missing or returned an empty array we fallback to the */
      /* in-memory defaults so that the waiter / client still sees the      */
      /* correct options instead of an empty list that triggers the         */
      /* “Can only move … to []” error.                                     */
      /* ------------------------------------------------------------------ */

      const transitions =
        allowedTransitions.length === 0
          ? this.getDefaultTransitions(currentStatus, userRole)
          : allowedTransitions;
      
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
      default:
        return status;
    }
  }

  /**
   * Refresh the cache for all status transitions
   */
  async refreshCache(): Promise<void> {
    try {
      this.logger.log('Refreshing order status transition cache');
      
      // Clear existing cache keys
      for (const key of this.cache.keys()) {
        if (key.startsWith(this.CACHE_KEY_PREFIX)) {
          this.cache.delete(key);
          this.cacheExpiry.delete(key);
        }
      }
      
      try {
        // Get all unique status and role combinations
        const configs = await (this.prisma as any).orderStatusConfig.findMany({
          select: {
            currentStatus: true,
            userRole: true,
          },
          distinct: ['currentStatus', 'userRole'],
        });
        
        // Pre-populate cache for each combination
        for (const config of configs) {
          await this.getAllowedTransitions(
            config.currentStatus,
            config.userRole,
          );
        }
        
        this.logger.log(`Cache refreshed for ${configs.length} status/role combinations`);
      } catch (dbError) {
        this.logger.error(`Database error during cache refresh: ${dbError.message}`);
        
        // Pre-populate cache with defaults for common combinations
        const roles = ['client', 'waiter', 'admin', 'manager'];
        const statuses = Object.values(OrderStatus);
        
        for (const role of roles) {
          for (const status of statuses) {
            await this.getAllowedTransitions(status, role);
          }
        }
        
        this.logger.log(`Cache populated with default transitions for all roles and statuses`);
      }
    } catch (error) {
      this.logger.error(`Error refreshing cache: ${error.message}`);
    }
  }

  /**
   * Get all possible status transitions for all roles
   */
  async getAllStatusConfigs() {
    try {
      try {
        return await (this.prisma as any).orderStatusConfig.findMany({
          orderBy: [
            { userRole: 'asc' },
            { currentStatus: 'asc' },
            { targetStatus: 'asc' },
          ],
        });
      } catch (dbError) {
        this.logger.error(`Database error fetching status configs: ${dbError.message}`);
        
        // Generate default configs if database fails
        const roles = ['client', 'waiter', 'admin', 'manager'];
        const statuses = Object.values(OrderStatus);
        const defaultConfigs: {
          id: string;
          currentStatus: OrderStatus;
          targetStatus: OrderStatus;
          userRole: string;
          label: string;
          createdAt: Date;
          updatedAt: Date;
        }[] = [];
        
        for (const role of roles) {
          for (const status of statuses) {
            const transitions = this.getDefaultTransitions(status, role);
            transitions.forEach(transition => {
              defaultConfigs.push({
                id: `default-${role}-${status}-${transition.targetStatus}`,
                currentStatus: status,
                targetStatus: transition.targetStatus,
                userRole: role,
                label: transition.label,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            });
          }
        }
        
        return defaultConfigs;
      }
    } catch (error) {
      this.logger.error(`Error fetching all status configs: ${error.message}`);
      return [];
    }
  }
}
