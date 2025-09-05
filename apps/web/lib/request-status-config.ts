import { RequestStatus } from './types';

import { api } from './api';

// Option format for dropdown components
interface StatusOption {
  value: string;
  label: string;
}


export class RequestStatusConfigService {

  /**
   * Get status options for dropdown components
   */
  static async getStatusOptions(
    currentStatus: RequestStatus,
    userRole: string,
    token: string
  ): Promise<StatusOption[]> {

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
          { value: 'New', label: 'Activate' },
          { value: 'Cancelled', label: 'Cancel' },
        ];
      case 'Acknowledged':
        return [
          { value: 'Acknowledged', label: 'Acknowledged' },
          { value: 'OnHold', label: 'Hold' },
          { value: 'Cancelled', label: 'Cancel' },
        ];
      case 'Completed':
        return [
          { value: 'Completed', label: 'Completed' },
          { value: 'New', label: 'Activate' },
          { value: 'Done', label: 'Done' },
        ];
      case 'Cancelled':
      case 'Done':
      case 'InProgress':
      default:
        return [{ value: currentStatus, label: currentStatus }];
    }
  }
}
