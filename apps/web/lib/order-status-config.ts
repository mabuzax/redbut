// Local copy of the OrderStatus enum (keep in sync with backend/prisma enum)
export enum OrderStatus {
  New = 'New',
  Acknowledged = 'Acknowledged',
  InProgress = 'InProgress',
  Delivered = 'Delivered',
  Paid = 'Paid',
  Cancelled = 'Cancelled',
  Complete = 'Complete',
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const CACHE_KEY = 'redbut_order_status_transitions';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export class OrderStatusConfigService {
  /**
   * Fetch allowed transitions from the API
   */
  static async fetchTransitions(
    currentStatus: OrderStatus,
    userRole: string,
    token: string
  ): Promise<StatusTransition[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/order-status-config/transitions?currentStatus=${currentStatus}&userRole=${userRole}`,
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
    currentStatus: OrderStatus,
    userRole: string,
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
    currentStatus: OrderStatus,
    userRole: string,
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
    currentStatus: OrderStatus,
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
  static getDefaultStatusOptions(currentStatus: OrderStatus): StatusOption[] {
    // Fallback options based on current status for client if API fails
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
          { value: 'Complete', label: 'Complete' },
        ];
      case 'Delivered':
        return [
          { value: 'Delivered', label: 'Delivered' },
          { value: 'Cancelled', label: 'Reject' },
        ];
      case 'Paid':
        return [
          { value: 'Paid', label: 'Paid' },
        ];
      default:
        return [{ value: currentStatus, label: currentStatus }];
    }
  }
}
