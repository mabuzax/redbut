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

// Option format for dropdown components
interface StatusOption {
  value: string;
  label: string;
}

export class OrderStatusConfigService {

  /**
   * Get status options for dropdown components
   */
  static async getStatusOptions(
    currentStatus: OrderStatus,
    userRole: string = 'waiter',
    token: string
  ): Promise<StatusOption[]> {
    // Always use default status options for dropdown
    return this.getDefaultStatusOptions(currentStatus);
  }

  /**
   * Get default status options if API fails
   */
  static getDefaultStatusOptions(currentStatus: OrderStatus): StatusOption[] {
    
    console.log('WAITER Getting default status options for status:', currentStatus);
    switch (currentStatus) {
      case 'New':
        return [
          { value: 'New', label: 'New' },
          { value: 'Acknowledged', label: 'Acknowledge' },
          { value: 'InProgress', label: 'In Progress' },
          { value: 'Cancelled', label: 'Cancel' },
        ];
      case 'Cancelled':
        return [
          { value: 'Cancelled', label: 'Cancelled' },
        ];
      case 'Acknowledged':
        return [
          { value: 'Acknowledged', label: 'Acknowledged' },
          { value: 'InProgress', label: 'In Progress' },
          { value: 'Cancelled', label: 'Cancel' },
        ];
      case 'InProgress':
        return [
          { value: 'InProgress', label: 'In Progress' },
          { value: 'Complete', label: 'Complete' },
          { value: 'Cancelled', label: 'Cancel' },
        ];
      case 'Complete':
        return [
          { value: 'Complete', label: 'Completed' },
          { value: 'InProgress', label: 'In Progress' },
          { value: 'Delivered', label: 'Delivered' },
        ];
      case 'Delivered':
        return [
          { value: 'Delivered', label: 'Delivered' },
          { value: 'InProgress', label: 'In Progress' },
          { value: 'Paid', label: 'Paid' },
          { value: 'Rejected', label: 'Rejected' },
        ];
      case 'Paid':
        return [
          { value: 'Paid', label: 'Paid' },
        ];
      case 'Rejected':
        return [
          { value: 'Rejected', label: 'Rejected' },
          { value: 'InProgress', label: 'In Progress' },
          { value: 'Cancelled', label: 'Cancel' },
        ];
      default:
        return [{ value: currentStatus, label: currentStatus }];
    }
  }
}
