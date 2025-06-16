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
 * Defines possible staff positions.
 */
export const STAFF_POSITIONS = ['Waiter', 'Chef', 'Manager', 'Supervisor'] as const;
export type StaffPosition = typeof STAFF_POSITIONS[number];

/**
 * Represents a staff member (waiter, chef, etc.) for the admin dashboard.
 * This interface combines information from the Waiter model and AccessUser model.
 */
export interface StaffMember {
  id: string;
  name: string;
  surname: string;
  email: string; // Primary email, also used as username for login
  tag_nickname: string;
  position?: StaffPosition; // Role like 'Waiter', 'Chef', 'Manager'
  address?: string | null;
  phone?: string | null;
  propic?: string | null;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  accessAccount?: {
    username: string; // Login username, typically the email
    userType: UserType; // System role: 'admin', 'waiter', 'manager'
  } | null;
  // Optional analytics fields if provided by specific endpoints
  averageRating?: number;
  requestsHandled?: number;
}

/**
 * DTO for creating a new staff member.
 */
export interface CreateStaffMemberDto {
  name: string;
  surname: string;
  email: string; 
  tag_nickname: string;
  position: StaffPosition;
  address?: string;
  phone?: string; 
  propic?: string;
  password?: string; // Optional: defaults to a system-defined new password if not provided
}

/**
 * DTO for updating an existing staff member.
 * Email/username and password changes are typically handled via separate, dedicated endpoints for security.
 */
export interface UpdateStaffMemberDto {
  name?: string;
  surname?: string;
  tag_nickname?: string;
  position?: StaffPosition;
  address?: string;
  phone?: string; 
  propic?: string;
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
 * Bucketed resolution counts for the “Requests Resolution” chart.
 */
export interface ResolutionBucket {
  range: string; // '<10mins' | '10-15mins' | '>15mins'
  count: number;
}

/**
 * Busiest time information for a specific date
 */
export interface BusiestTime {
  hour: number; // Starting hour of the busiest period (e.g., 14 for 2 PM)
  label: string; // User-friendly label (e.g., "2 PM - 3 PM")
  count: number; // Number of requests during this hour
}

/**
 * Peak time requests information
 */
export interface PeakTimeRequests {
  peakTime: string; // User-friendly label for the peak period
  totalRequests: number; // Total requests during that peak period
}

/**
 * Waiter performance metrics
 */
export interface WaiterPerformance {
  waiterId: string;
  waiterName: string;
  requestsHandled: number;
  avgResolutionTime: number; // in minutes
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
 * Menu item data structure
 */
export interface MenuItem {
  id: string;
  category?: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  status: string;
  video?: string;
  served_info?: string;
  available_options?: any;
  available_extras?: any;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create menu item DTO
 */
export interface CreateMenuItemDto {
  category?: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  status?: string;
  video?: string;
  served_info?: string;
  available_options?: any;
  available_extras?: any;
}

/**
 * Update menu item DTO
 */
export interface UpdateMenuItemDto extends Partial<CreateMenuItemDto> {}

/**
 * Menu items response with pagination
 */
export interface MenuItemsResponse {
  items: MenuItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Menu filters for API calls
 */
export interface MenuFilters {
  category?: string;
  status?: string;
  search?: string;
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

/**
 * DTO for AI query request for Staff Management.
 */
export interface AiQueryRequest {
  message: string;
}

/**
 * Response types for AI query for Staff Management.
 */
export type AiQueryResponse = 
  | string 
  | StaffMember 
  | StaffMember[] 
  | { message: string } 
  | string[];


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
   * Resolution analytics – bucketed counts of how long it took
   * for requests created on a given day to reach Completed/Done.
   * Uses the same bucket format as the old time-range chart.
   *
   * @param date YYYY-MM-DD calendar day
   * @returns Array of { range: '<10mins' | '10-15mins' | '>15mins', count: number }
   */
  getRequestsResolutionAnalytics: async (
    token: string,
    date: string,
  ): Promise<ResolutionBucket[]> => {
    return callApi<ResolutionBucket[]>(
      `/admin/requests/analytics/resolution?date=${date}`,
      token,
    );
  },

  /**
   * Get the busiest hour for a specific date
   * @param token The JWT authentication token
   * @param date YYYY-MM-DD calendar day
   * @returns The hour with the most requests
   */
  getBusiestTime: async (
    token: string,
    date: string,
  ): Promise<BusiestTime> => {
    return callApi<BusiestTime>(
      `/admin/requests/analytics/busiest-time?date=${date}`,
      token,
    );
  },

  /**
   * Get total requests during peak time for a specific date
   * @param token The JWT authentication token
   * @param date YYYY-MM-DD calendar day
   * @returns Peak time and total requests count
   */
  getPeakTimeRequests: async (
    token: string,
    date: string,
  ): Promise<PeakTimeRequests> => {
    return callApi<PeakTimeRequests>(
      `/admin/requests/analytics/peak-time-requests?date=${date}`,
      token,
    );
  },

  /**
   * Get waiter performance ranking by average resolution time
   * @param token The JWT authentication token
   * @param date YYYY-MM-DD calendar day
   * @returns Array of waiter performance metrics ranked from fastest to slowest
   */
  getWaiterPerformanceAnalytics: async (
    token: string,
    date: string,
  ): Promise<WaiterPerformance[]> => {
    return callApi<WaiterPerformance[]>(
      `/admin/requests/analytics/waiter-performance?date=${date}`,
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
    return callApi<any>(`/admin/staff/${waiterId}/performance`, token); // This endpoint might not exist yet or might be part of general staff info
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

  /* ---------------------------------------------------------------------- */
  /*  Staff Management                                                      */
  /* ---------------------------------------------------------------------- */
  /**
   * Fetches a list of all staff members.
   * @param token The JWT authentication token.
   * @returns A promise that resolves to an array of staff members.
   */
  getAllStaffMembers: async (token: string): Promise<StaffMember[]> => {
    return callApi<StaffMember[]>('/admin/staff', token);
  },

  /**
   * Fetches a specific staff member by ID.
   * @param token The JWT authentication token.
   * @param id The ID of the staff member.
   * @returns A promise that resolves to the staff member details.
   */
  getStaffMemberById: async (token: string, id: string): Promise<StaffMember> => {
    return callApi<StaffMember>(`/admin/staff/${id}`, token);
  },

  /**
   * Creates a new staff member.
   * @param token The JWT authentication token.
   * @param data The data for the new staff member.
   * @returns A promise that resolves to the created staff member.
   */
  createStaffMember: async (
    token: string,
    data: CreateStaffMemberDto,
  ): Promise<StaffMember> => {
    return callApi<StaffMember>('/admin/staff', token, 'POST', data);
  },

  /**
   * Updates an existing staff member.
   * @param token The JWT authentication token.
   * @param id The ID of the staff member to update.
   * @param data The updated data for the staff member.
   * @returns A promise that resolves to the updated staff member.
   */
  updateStaffMember: async (
    token: string,
    id: string,
    data: UpdateStaffMemberDto,
  ): Promise<StaffMember> => {
    return callApi<StaffMember>(`/admin/staff/${id}`, token, 'PUT', data);
  },

  /**
   * Deletes a staff member.
   * @param token The JWT authentication token.
   * @param id The ID of the staff member to delete.
   * @returns A promise that resolves when the staff member is deleted.
   */
  deleteStaffMember: async (token: string, id: string): Promise<void> => {
    await callApi<void>(`/admin/staff/${id}`, token, 'DELETE');
  },

  /**
   * Processes an AI query for staff management.
   * @param token The JWT authentication token.
   * @param query The AI query request.
   * @returns A promise that resolves to the AI's response.
   */
  processStaffAiQuery: async (
    token: string,
    query: AiQueryRequest,
  ): Promise<AiQueryResponse> => {
    return callApi<AiQueryResponse>('/admin/staff/ai/query', token, 'POST', query);
  },


  /* ---------------------------------------------------------------------- */
  /*  Menu Management                                                       */
  /* ---------------------------------------------------------------------- */

  /**
   * Get all menu items with filtering and pagination
   * @param token The JWT authentication token
   * @param filters Optional filters for category, status, search, pagination
   * @returns Menu items with pagination info
   */
  getMenuItems: async (
    token: string,
    filters: MenuFilters = {},
  ): Promise<MenuItemsResponse> => {
    const queryParams = new URLSearchParams();
    if (filters.category) queryParams.append('category', filters.category);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.page) queryParams.append('page', String(filters.page));
    if (filters.pageSize) queryParams.append('pageSize', String(filters.pageSize));

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return callApi<MenuItemsResponse>(`/admin/menu${queryString}`, token);
  },

  /**
   * Get all available menu categories
   * @param token The JWT authentication token
   * @returns Array of category names
   */
  getMenuCategories: async (token: string): Promise<string[]> => {
    return callApi<string[]>('/admin/menu/categories', token);
  },

  /**
   * Get menu item by ID
   * @param token The JWT authentication token
   * @param id Menu item ID
   * @returns Menu item details
   */
  getMenuItemById: async (token: string, id: string): Promise<MenuItem> => {
    return callApi<MenuItem>(`/admin/menu/${id}`, token);
  },

  /**
   * Create a new menu item
   * @param token The JWT authentication token
   * @param data Menu item data
   * @returns Created menu item
   */
  createMenuItem: async (
    token: string,
    data: CreateMenuItemDto,
  ): Promise<MenuItem> => {
    return callApi<MenuItem>('/admin/menu', token, 'POST', data);
  },

  /**
   * Update an existing menu item
   * @param token The JWT authentication token
   * @param id Menu item ID
   * @param data Updated menu item data
   * @returns Updated menu item
   */
  updateMenuItem: async (
    token: string,
    id: string,
    data: UpdateMenuItemDto,
  ): Promise<MenuItem> => {
    return callApi<MenuItem>(`/admin/menu/${id}`, token, 'PUT', data);
  },

  /**
   * Delete a menu item
   * @param token The JWT authentication token
   * @param id Menu item ID
   */
  deleteMenuItem: async (token: string, id: string): Promise<void> => {
    await callApi<void>(`/admin/menu/${id}`, token, 'DELETE');
  },

  /**
   * Bulk upload menu items from processed JSON data
   * @param token The JWT authentication token
   * @param items Array of menu item data
   * @returns Upload result with created and failed counts
   */
  bulkUploadMenuItems: async (
    token: string,
    items: any[],
  ): Promise<{ created: number; failed: number }> => {
    return callApi<{ created: number; failed: number }>(
      '/admin/menu/bulk-upload-json',
      token,
      'POST',
      { items },
    );
  },
};
