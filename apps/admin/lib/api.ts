import { UserType } from '@prisma/client';

// Define interfaces for API data structures
// These should ideally be shared from a common `packages/types` or similar
// but for now, we'll define them here for clarity.

/**
 * Represents a restaurant metrics summary for the admin dashboard.
 */
export interface RestaurantMetrics {
  totalTables: number;
  occupiedTables: number;
  totalRequests: number;
  openRequests: number;
  averageResponseTime: number; // in minutes
  dailyRevenue: number;
}

/**
 * Represents a staff member (waiter) for the admin dashboard.
 */
export interface StaffMember {
  id: string;
  name: string;
  surname: string;
  email: string;
  tag_nickname: string;
  userType: UserType;
  propic?: string;
  averageRating?: number;
  requestsHandled?: number;
}

/**
 * Represents a request summary for the admin dashboard.
 */
export interface RequestSummary {
  id: string;
  tableNumber: number;
  content: string;
  status: string;
  waiterId?: string;
  waiterName?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  responseTime?: number; // in minutes
}

/**
 * Hour-chunked open/closed counts for a single day.  Used by the line chart.
 */
export interface HourlyRequestData {
  hour: number;   // 0-23
  open: number;
  closed: number;
}

/**
 * Full daily breakdown (07:00-02:00) returned by the analytics endpoint.
 */
export interface AdminRequestSummary {
  date: string; // YYYY-MM-DD
  hourly: HourlyRequestData[];
}

/**
 * Rich filters for list / summary queries.
 */
export interface RequestFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  waiterId?: string;
  search?: string;
  sort?: 'createdAt' | 'status' | 'tableNumber';
  page?: number;
  pageSize?: number;
}

/**
 * DTO for admin login request.
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Response DTO for successful admin login.
 */
export interface LoginResponse {
  userId: string;
  username: string;
  name: string;
  token: string;
  requiresPasswordChange: boolean;
}

/**
 * DTO for changing admin password.
 */
export interface ChangePasswordRequest {
  userId: string;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Base URL for the API, defaulting to localhost for development
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Generic function to make authenticated API calls.
 * @param endpoint The API endpoint (e.g., '/metrics/summary').
 * @param token The JWT authentication token.
 * @param method HTTP method (GET, POST, PUT, DELETE).
 * @param body Request body for POST/PUT.
 * @returns Parsed JSON response.
 * @throws Error if the API call fails or returns a non-OK status.
 */
async function callApi<T>(
  endpoint: string,
  token: string,
  method: string = 'GET',
  body?: object,
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const url = `${API_BASE_URL}/api/v1${endpoint}`;

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || `API call failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Same as callApi but without Authorization header (public endpoints).
 */
async function callPublicApi<T>(
  endpoint: string,
  method: string = 'POST',
  body?: object,
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const config: RequestInit = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const url = `${API_BASE_URL}/api/v1${endpoint}`;
  const response = await fetch(url, config);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || `API call failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

/**
 * API client for admin-specific operations.
 */
export const adminApi = {
  /* ---------------------------------------------------------------------- */
  /*  Authentication                                                         */
  /* ---------------------------------------------------------------------- */

  /**
   * Login endpoint (public, no token required).
   * Returns JWT and admin details on success.
   */
  login: async (username: string, password: string): Promise<LoginResponse> => {
    return callPublicApi<LoginResponse>('/auth/admin/login', 'POST', {
      username,
      password,
    } as LoginRequest);
  },

  /**
   * Change password when current password equals "__new__pass".
   */
  changePassword: async (dto: ChangePasswordRequest): Promise<void> => {
    await callPublicApi<void>('/auth/admin/change-password', 'POST', dto);
  },

  /**
   * Utility: detects first-time login default password.
   */
  checkPassword: (password: string): boolean => password === '__new__pass',

  /* ---------------------------------------------------------------------- */
  /*  Dashboard Analytics                                                    */
  /* ---------------------------------------------------------------------- */

  /**
   * Fetches a summary of restaurant metrics for the admin dashboard.
   * @param token The JWT authentication token.
   * @returns A promise that resolves to restaurant metrics.
   */
  getRestaurantMetrics: async (token: string): Promise<RestaurantMetrics> => {
    return callApi<RestaurantMetrics>('/admin/metrics/summary', token);
  },

  /**
   * Fetches a list of all staff members (waiters).
   * @param token The JWT authentication token.
   * @returns A promise that resolves to an array of staff members.
   */
  getStaffMembers: async (token: string): Promise<StaffMember[]> => {
    return callApi<StaffMember[]>('/admin/staff', token);
  },

  /**
   * Fetches a summary of all requests.
   * @param token The JWT authentication token.
   * @param filters Optional filters (status, date range, etc.)
   * @returns A promise that resolves to an array of request summaries.
   */
  getRequestSummaries: async (
    token: string,
    filters: RequestFilters = {},
  ): Promise<RequestSummary[]> => {
    const queryParams = new URLSearchParams();
    if (filters.status)     queryParams.append('status', filters.status);
    if (filters.startDate)  queryParams.append('startDate', filters.startDate);
    if (filters.endDate)    queryParams.append('endDate', filters.endDate);
    if (filters.waiterId)   queryParams.append('waiterId', filters.waiterId);
    if (filters.search)     queryParams.append('search', filters.search);
    if (filters.sort)       queryParams.append('sort', filters.sort);
    if (filters.page)       queryParams.append('page', String(filters.page));
    if (filters.pageSize)   queryParams.append('pageSize', String(filters.pageSize));

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return callApi<RequestSummary[]>(`/admin/requests${queryString}`, token);
  },

  /**
   * Alias for clarity – fetch paginated / filtered list of requests.
   */
  getAllRequests: async (
    token: string,
    filters: RequestFilters = {},
  ): Promise<RequestSummary[]> => {
    return adminApi.getRequestSummaries(token, filters);
  },

  /**
   * Simple counts + average resolution time for dashboard header card.
   */
  getRequestsSummary: async (
    token: string,
  ): Promise<{ open: number; closed: number; avgResolutionTime: number }> => {
    return callApi<{ open: number; closed: number; avgResolutionTime: number }>(
      '/admin/requests/summary',
      token,
    );
  },

  /**
   * Hourly analytics for a given calendar day (used by line chart).
   * @param date format YYYY-MM-DD
   */
  getHourlyRequestAnalytics: async (
    token: string,
    date: string,
  ): Promise<AdminRequestSummary> => {
    return callApi<AdminRequestSummary>(
      `/admin/requests/analytics/hourly?date=${date}`,
      token,
    );
  },

  /**
   * Fetches performance metrics for a specific waiter.
   * @param token The JWT authentication token.
   * @param waiterId The ID of the waiter.
   * @returns A promise that resolves to waiter performance metrics.
   */
  getWaiterPerformance: async (token: string, waiterId: string): Promise<any> => {
    return callApi<any>(`/admin/staff/${waiterId}/performance`, token);
  },

  /**
   * Fetches revenue data for the dashboard charts.
   * @param token The JWT authentication token.
   * @param period The time period ('day', 'week', 'month', 'year').
   * @returns A promise that resolves to revenue data.
   */
  getRevenueData: async (
    token: string,
    period: 'day' | 'week' | 'month' | 'year' = 'day',
  ): Promise<any> => {
    return callApi<any>(`/admin/metrics/revenue?period=${period}`, token);
  },

  /**
   * Fetches customer satisfaction data for the dashboard charts.
   * @param token The JWT authentication token.
   * @param period The time period ('day', 'week', 'month', 'year').
   * @returns A promise that resolves to satisfaction data.
   */
  getSatisfactionData: async (
    token: string,
    period: 'day' | 'week' | 'month' | 'year' = 'day',
  ): Promise<any> => {
    return callApi<any>(`/admin/metrics/satisfaction?period=${period}`, token);
  },
};
