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
    // Fallback options based on current status if API fails
    switch (currentStatus) {
      case 'New':
        return [
          { value: 'New', label: 'New' },
          { value: 'OnHold', label: 'Hold' },
          { value: 'Cancelled', label: 'Cancel' },
        ];
      case 'OnHold':
        return [
          { value: 'OnHold', label: 'On Hold' },
          { value: 'New', label: 'ReOpen' },
          { value: 'Cancelled', label: 'Cancel' },
        ];
      case 'Acknowledged':
        return [
          { value: 'Acknowledged', label: 'Acknowledged' },
          { value: 'OnHold', label: 'Hold' },
          { value: 'Cancelled', label: 'Cancel' },
        ];
      case 'Done':
        return [
          { value: 'Done', label: 'Done' },
          { value: 'New', label: 'ReOpen' }
        ];
      case 'Cancelled':
      case 'Done':
      case 'InProgress':
      default:
        return [{ value: currentStatus, label: currentStatus }];
    }
  }
}
