import { RequestStatus } from '@prisma/client';

// Types for API responses and cached data
interface StatusTransition {
  targetStatus: RequestStatus;
  label: string;
}

interface StatusTransitionsResponse {
  currentStatus: RequestStatus;
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const CACHE_KEY = 'redbut_waiter_status_transitions';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export class RequestStatusConfigService {
  /**
   * Fetch allowed transitions from the API
   */
  static async fetchTransitions(
    currentStatus: RequestStatus,
    userRole: string = 'waiter',
    token: string
  ): Promise<StatusTransition[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/request-status-config/transitions?currentStatus=${currentStatus}&userRole=${userRole}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch status transitions: ${response.statusText}`);
      }

      const data: StatusTransitionsResponse = await response.json();
      return data.transitions;
    } catch (error) {
      console.error('Error fetching status transitions:', error);
      return [];
    }
  }

  /**
   * Get cached transitions or fetch from API if not cached
   */
  static async getTransitions(
    currentStatus: RequestStatus,
    userRole: string = 'waiter',
    token: string
  ): Promise<StatusTransition[]> {
    // Try to get from cache first
    const cachedData = this.getCachedTransitions();
    const cacheKey = `${currentStatus}:${userRole}`;

    // If we have valid cached data for this status and role
    if (cachedData && cachedData.data[cacheKey]) {
      return cachedData.data[cacheKey];
    }

    // Otherwise fetch from API
    const transitions = await this.fetchTransitions(currentStatus, userRole, token);
    
    // Update cache with new data
    this.updateCache(currentStatus, userRole, transitions);
    
    return transitions;
  }

  /**
   * Get status options for dropdown components
   */
  static async getStatusOptions(
    currentStatus: RequestStatus,
    userRole: string = 'waiter',
    token: string
  ): Promise<StatusOption[]> {
    const transitions = await this.getTransitions(currentStatus, userRole, token);
    
    // Format transitions for dropdown
    return transitions.map(transition => ({
      value: transition.targetStatus,
      label: transition.label,
    }));
  }

  /**
   * Get cached transitions from localStorage
   */
  private static getCachedTransitions(): CachedTransitions | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const parsedCache: CachedTransitions = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is expired
      if (now - parsedCache.timestamp > CACHE_TTL) {
        this.clearCache();
        return null;
      }
      
      return parsedCache;
    } catch (error) {
      console.error('Error reading from cache:', error);
      this.clearCache();
      return null;
    }
  }

  /**
   * Update cache with new transitions
   */
  private static updateCache(
    currentStatus: RequestStatus,
    userRole: string,
    transitions: StatusTransition[]
  ): void {
    try {
      const cacheKey = `${currentStatus}:${userRole}`;
      const existingCache = this.getCachedTransitions();
      
      const newCache: CachedTransitions = {
        timestamp: Date.now(),
        data: {
          ...(existingCache?.data || {}),
          [cacheKey]: transitions,
        },
      };
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
    } catch (error) {
      console.error('Error updating cache:', error);
    }
  }

  /**
   * Clear the cache
   */
  static clearCache(): void {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
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
          { value: 'Acknowledged', label: 'Acknowledge' },
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
      case 'Acknowledged':
        return [
          { value: 'Acknowledged', label: 'Acknowledged' },
          { value: 'InProgress', label: 'In Progress' },
          { value: 'Cancelled', label: 'Cancel' },
        ];
      case 'InProgress':
        return [
          { value: 'InProgress', label: 'In Progress' },
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
