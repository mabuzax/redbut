import { RequestStatus } from './types';

// Option format for dropdown components
interface StatusOption {
  value: string;
  label: string;
}

export class RequestStatusConfigService {
  /**
   * Get status options for dropdown components
   */
  static getStatusOptions(currentStatus: RequestStatus): StatusOption[] {
    return this.getDefaultStatusOptions(currentStatus);
  }


  /**
   * Get default status options if API fails
   */
  static getDefaultStatusOptions(currentStatus: RequestStatus): StatusOption[] {
    // Fallback options based on current status for waiters if API fails
    switch (currentStatus) {
      case 'New':
        return [
          { value: 'New', label: 'New' },
          { value: 'InProgress', label: 'In Progress' },
          { value: 'Completed', label: 'Completed' },
          { value: 'Cancelled', label: 'Cancel' },
        ];
      case 'OnHold':
        return [
          { value: 'OnHold', label: 'On Hold' },
          { value: 'New', label: 'Activate' },
          { value: 'Cancelled', label: 'Cancel' },
        ];
      case 'InProgress':
        return [
          { value: 'InProgress', label: 'In Progress2' },
          { value: 'Completed', label: 'Completed' },
          { value: 'Cancelled', label: 'Cancel' },
        ];
      case 'Completed':
      case 'Cancelled':
      case 'Done':
      default:
        return [{ value: currentStatus, label: currentStatus }];
    }
  }
}
