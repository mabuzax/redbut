import { api } from './api';

// Local copy of the OrderStatus enum (keep in sync with backend/prisma enum)
export enum OrderStatus {
  New = 'New',
  Acknowledged = 'Acknowledged',
  InProgress = 'InProgress',
  Complete = 'Complete',
  Delivered = 'Delivered',
  Paid = 'Paid',
  Cancelled = 'Cancelled',
  Rejected = 'Rejected',
}

// Types for API responses and cached data
interface StatusTransition {
  targetStatus: OrderStatus;
  label: string;
}

interface StatusTransitionsResponse {
  currentStatus: OrderStatus;
  userRole: string;
  transitions: StatusTransition[];
}

interface CachedTransitions {
  timestamp: number;
  data: Record<string, StatusTransition[]>;
}

// Option format for dropdown components
interface StatusOption {
  value: string;
  label: string;
}

// Configuration constants
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = 'redBut_order_status_transitions';

export class OrderStatusConfigService {

  /**
   * Get status options for dropdown components
   */
  static async getStatusOptions(
    currentStatus: OrderStatus,
    userRole: string,
    token: string
  ): Promise<StatusOption[]> {
    // Always use default status options for dropdown
    return this.getDefaultStatusOptions(currentStatus);
  }


  /**
   * Get default status options if API fails
   */
  static getDefaultStatusOptions(currentStatus: OrderStatus): StatusOption[] {
    // Fallback options based on current status for client if API fails

    console.log('Using default status options for client');
    switch (currentStatus) {
      case 'New':
        return [
          { value: 'New', label: 'New' },
          { value: 'Cancelled', label: 'Cancel' },
        ];
      case 'Cancelled':
        return [
          { value: 'Cancelled', label: 'Cancelled' },
        ];
      case 'Acknowledged':
        return [
          { value: 'Acknowledged', label: 'Acknowledged' },
          { value: 'Cancelled', label: 'Cancel' },
        ];
      case 'InProgress':
        return [
          { value: 'InProgress', label: 'In Progress' },
        ];
      case 'Complete':
        return [
          { value: 'Complete', label: 'Completed' },
        ];
      case 'Delivered':
        return [
          { value: 'Delivered', label: 'Delivered' },
          { value: 'Rejected', label: 'Reject' },
        ];
      case 'Paid':
        return [
          { value: 'Paid', label: 'Paid' },
        ];
      case 'Rejected':
        return [
          { value: 'Rejected', label: 'Rejected' },
        ];
      default:
        return [{ value: currentStatus, label: currentStatus }];
    }
  }
}
