// Local copy of the OrderStatus enum (keep in sync with backend/prisma enum)
export enum OrderStatus {
  New = 'New',
  InProgress = 'InProgress',
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
  static getStatusOptions(
    currentStatus: OrderStatus
  ): StatusOption[] {
    return this.getDefaultStatusOptions(currentStatus);
  }

  /**
   * Get status options based on current status
   */
  static getDefaultStatusOptions(currentStatus: OrderStatus): StatusOption[] {
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
      case 'InProgress':
        return [
          { value: 'InProgress', label: 'In Progress3' },
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
