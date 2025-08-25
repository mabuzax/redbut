import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RequestStatus } from '@prisma/client';
// import Redis from 'ioredis'; // Temporarily commented out for build

@Injectable()
export class RequestStatusConfigService {
  private readonly logger = new Logger(RequestStatusConfigService.name);
  // private readonly redis: Redis; // Temporarily commented out
  private readonly cache = new Map<string, string>(); // In-memory cache replacement
  private readonly CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds
  private readonly CACHE_KEY_PREFIX = 'request_status_config:';
  private readonly cacheExpiry = new Map<string, number>(); // Track expiration times

  constructor(private readonly prisma: PrismaService) {
    // Temporarily replaced Redis with in-memory cache
    // this.redis = new Redis({
    //   host: process.env.REDIS_HOST || 'localhost',
    //   port: parseInt(process.env.REDIS_PORT || '6379'),
    //   password: process.env.REDIS_PASSWORD,
    // });
    this.logger.log('RequestStatusConfigService initialized with in-memory cache');
  }

  /**
   * Get allowed transitions for a specific status and user role
   */
  async getAllowedTransitions(
    currentStatus: RequestStatus,
    userRole: string,
  ): Promise<{ targetStatus: RequestStatus; label: string }[]> {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}${currentStatus}:${userRole}`;
      
      // Try to get from cache first
      const cachedData = this.cache.get(cacheKey);
      const now = Math.floor(Date.now() / 1000);
      
      if (cachedData && this.cacheExpiry.get(cacheKey)! > now) {
        this.logger.debug(`Cache hit for ${cacheKey}`);
        return JSON.parse(cachedData);
      }
      
      this.logger.debug(`Cache miss for ${cacheKey}, fetching from database`);

      try {
        const transitions = await this.prisma.requestStatusConfig.findMany({
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

        // If none found fallback to defaults
        const result =
          transitions.length === 0
            ? this.getDefaultTransitions(currentStatus, userRole)
            : transitions;

        this.cache.set(cacheKey, JSON.stringify(result));
        this.cacheExpiry.set(cacheKey, now + this.CACHE_TTL);
        return result;
      } catch (dbErr) {
        this.logger.error(`DB error: ${dbErr.message}. Using default transitions.`);
        const defaults = this.getDefaultTransitions(currentStatus, userRole);
        this.cache.set(cacheKey, JSON.stringify(defaults));
        this.cacheExpiry.set(cacheKey, now + this.CACHE_TTL);
        return defaults;
      }
    } catch (error) {
      this.logger.error(`Error fetching allowed transitions: ${error.message}`);
      return this.getDefaultTransitions(currentStatus, userRole);
    }
  }

  /**
   * Validate if a transition is allowed for the given status and user role
   */
  async validateTransition(
    currentStatus: RequestStatus,
    newStatus: RequestStatus,
    userRole: string,
  ): Promise<boolean> {
    try {
      // No change → always valid
      if (currentStatus === newStatus) {
        return true;
      }

      const transitions = await this.getAllowedTransitions(
        currentStatus,
        userRole,
      );

      const isAllowed = transitions.some(
        (t) => t.targetStatus === newStatus,
      );

      if (!isAllowed) {
        const list = transitions.map((t) => t.label).join(', ');
        throw new BadRequestException(
          `The request cannot change to "${newStatus}" from its current status. Available options: ${list || 'None'}`,
        );
      }

      return true;
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      // fallback generic
      throw new BadRequestException(
        'Unable to update request status at this time. Please try again later.',
      );
    }
  }

  /**
   * Get the display label for a specific status transition
   */
  async getTransitionLabel(
    currentStatus: RequestStatus,
    targetStatus: RequestStatus,
    userRole: string,
  ): Promise<string> {
    try {
      const transitions = await this.getAllowedTransitions(currentStatus, userRole);
      const transition = transitions.find(t => t.targetStatus === targetStatus);
      return transition?.label || targetStatus;
    } catch (error) {
      return this.formatStatusLabel(targetStatus);
    }
  }

  // -------- helpers ----------

  private formatStatusLabel(status: RequestStatus): string {
    switch (status) {
      case 'InProgress':
        return 'In Progress';
      default:
        return status;
    }
  }

  private getDefaultTransitions(
    currentStatus: RequestStatus,
    userRole: string,
  ): { targetStatus: RequestStatus; label: string }[] {
    if (userRole === 'client') {
      switch (currentStatus) {
        case 'New':
          return [
            { targetStatus: 'New', label: 'New' },
            { targetStatus: 'OnHold', label: 'Hold' },
            { targetStatus: 'Cancelled', label: 'Cancel' },
          ];
        case 'OnHold':
          return [
            { targetStatus: 'OnHold', label: 'On Hold' },
            { targetStatus: 'New', label: 'Activate' },
            { targetStatus: 'Cancelled', label: 'Cancel' },
          ];
        default:
          return [{ targetStatus: currentStatus, label: this.formatStatusLabel(currentStatus) }];
      }
    }

    if (userRole === 'waiter') {
      switch (currentStatus) {
        case 'New':
          return [
            { targetStatus: 'New', label: 'New' },
            { targetStatus: 'Acknowledged', label: 'Acknowledge' },
            { targetStatus: 'InProgress', label: 'In Progress' },
            { targetStatus: 'Cancelled', label: 'Cancel' },
          ];
        case 'Acknowledged':
          return [
            { targetStatus: 'Acknowledged', label: 'Acknowledged' },
            { targetStatus: 'InProgress', label: 'In Progress' },
            { targetStatus: 'Cancelled', label: 'Cancel' },
          ];
        default:
          return [{ targetStatus: currentStatus, label: this.formatStatusLabel(currentStatus) }];
      }
    }

    // admin/manager – allow all
    return Object.values(RequestStatus).map((s) => ({
      targetStatus: s,
      label: this.formatStatusLabel(s),
    }));
  }

  /**
   * Refresh the cache for all status transitions
   */
  async refreshCache(): Promise<void> {
    try {
      this.logger.log('Refreshing status transition cache');
      
      // Clear existing cache keys
      const keysToDelete: string[] = [];
      this.cache.forEach((_, key) => {
        if (key.startsWith(this.CACHE_KEY_PREFIX)) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      });
      
      // Get all unique status and role combinations
      const configs = await this.prisma.requestStatusConfig.findMany({
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
    } catch (error) {
      this.logger.error(`Error refreshing cache: ${error.message}`);
    }
  }

  /**
   * Get all possible status transitions for all roles
   */
  async getAllStatusConfigs() {
    try {
      return await this.prisma.requestStatusConfig.findMany({
        orderBy: [
          { userRole: 'asc' },
          { currentStatus: 'asc' },
          { targetStatus: 'asc' },
        ],
      });
    } catch (error) {
      this.logger.error(`Error fetching all status configs: ${error.message}`);
      return [];
    }
  }
}
