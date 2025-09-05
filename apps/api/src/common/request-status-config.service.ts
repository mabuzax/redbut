import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RequestStatus } from '@prisma/client';
// import Redis from 'ioredis'; // Temporarily commented out for build

@Injectable()
export class RequestStatusConfigService {
  private readonly logger = new Logger(RequestStatusConfigService.name);

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
    return this.getDefaultTransitions(currentStatus, userRole);
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
          `The request cannot change to "${newStatus}". The status may have changed while you were editing. Refresh for the latest status`,
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
    // Client (web app) transitions based on attachment rules
    // Treat 'guest' role the same as 'client' role
    if (userRole === 'client' || userRole === 'guest') {
      switch (currentStatus) {
        case 'New':
          return [
            { targetStatus: 'New', label: 'New' },
            { targetStatus: 'OnHold', label: 'Hold' },
            { targetStatus: 'Cancelled', label: 'Cancel' },
          ];
        case 'OnHold':
          return [
            { targetStatus: 'OnHold', label: 'onHold' },
            { targetStatus: 'Cancelled', label: 'Cancel' },
            { targetStatus: 'New', label: 'Activate' },
          ];
        case 'Cancelled':
          return []; // No dropdown, text: Cancelled
        case 'Acknowledged':
          return [
            { targetStatus: 'Acknowledged', label: 'Acknowledge' },
            { targetStatus: 'OnHold', label: 'Hold' },
            { targetStatus: 'Cancelled', label: 'Cancel' },
          ];
        case 'InProgress':
          return []; // Clients cannot change status when request is InProgress - only waiters can modify it
        case 'Completed':
          return [
            { targetStatus: 'Completed', label: 'Completed' },
            { targetStatus: 'New', label: 'Activate' },
            { targetStatus: 'Done', label: 'Done' },
          ];
        case 'Done':
          return []; // No dropdown, text: Done
        default:
          return [];
      }
    }

    // Waiter transitions based on attachment rules
    if (userRole === 'waiter') {
      switch (currentStatus) {
        case 'New':
          return [
            { targetStatus: 'New', label: 'New' },
            { targetStatus: 'Acknowledged', label: 'Acknowledge' },
            { targetStatus: 'InProgress', label: 'In Progress' },
            { targetStatus: 'Cancelled', label: 'Cancel' },
          ];
        case 'OnHold':
          return [
            { targetStatus: 'OnHold', label: 'onHold' },
            { targetStatus: 'New', label: 'Activate' },
            { targetStatus: 'Cancelled', label: 'Cancel' },
          ];
        case 'Cancelled':
          return []; // No dropdown, text: Cancelled
        case 'Acknowledged':
          return [
            { targetStatus: 'Acknowledged', label: 'Acknowledged' },
            { targetStatus: 'InProgress', label: 'In Progress' },
            { targetStatus: 'Cancelled', label: 'Cancel' },
          ];
        case 'InProgress':
          return [
            { targetStatus: 'InProgress', label: 'In Progress' },
            { targetStatus: 'Completed', label: 'Completed' },
            { targetStatus: 'Cancelled', label: 'Cancel' },
          ];
        case 'Completed':
          return []; // No dropdown, Red text: Waiting on user...
        case 'Done':
          return []; // No dropdown, text: Done
        default:
          return [];
      }
    }

    // Admin/Manager transitions - allow all statuses based on attachment
    if (userRole === 'admin' || userRole === 'manager') {
      return [
        { targetStatus: 'New', label: 'New' },
        { targetStatus: 'OnHold', label: 'Hold' },
        { targetStatus: 'Cancelled', label: 'Cancel' },
        { targetStatus: 'Acknowledged', label: 'Acknowledge' },
        { targetStatus: 'InProgress', label: 'In Progress' },
        { targetStatus: 'Completed', label: 'Completed' },
        { targetStatus: 'Done', label: 'Done' },
      ];
    }

    // Fallback - no transitions allowed
    return [];
  }

}
