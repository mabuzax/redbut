import { RequestStatus } from '@prisma/client';

// Define interfaces for API data structures
// These should ideally be shared from a common `packages/types` or similar
// but for now, we'll define them here for clarity.

/**
 * Represents a user request in the system.
 */
export interface WaiterRequest {
  id: string;
  userId: string;
  tableNumber: number;
  content: string;
  status: RequestStatus;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

/**
 * DTO for updating a request status.
 */
export interface UpdateRequestStatusDto {
  status: 'Acknowledged' | 'InProgress' | 'Completed';
}

/**
 * Summary of open and closed requests.
 */
export interface RequestsSummary {
  open: number;
  closed: number;
}

/**
 * Summary of reviews.
 */
export interface ReviewsSummary {
  averageRating: number;
  totalReviews: number;
}

/**
 * Represents a customer review.
 */
export interface Review {
  id: string;
  userId: string;
  rating: number;
  content: string;
  createdAt: string; // ISO string
}

/**
 * AI performance analysis response.
 */
export interface AIAnalysisResponse {
  analysis: string;
}

/* -------------------------------------------------------------------------- */
/*  New authentication DTOs for waiter login & password change                */
/* -------------------------------------------------------------------------- */

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  userId: string;
  username: string;
  waiterId: string;
  name: string;
  token: string;
}

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
 * @param endpoint The API endpoint (e.g., '/requests/active').
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

  console.log(`Preparing API request to: ${API_BASE_URL}/api/v1${endpoint}`);
  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const url = `${API_BASE_URL}/api/v1${endpoint}`;

  console.log(`Making API request to: ${url} with config:`, config);
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
 * API client for waiter-specific operations.
 */
export const waiterApi = {
  /* ---------------------------------------------------------------------- */
  /*  Authentication                                                         */
  /* ---------------------------------------------------------------------- */

  /**
   * Login endpoint (public, no token required).
   * Returns JWT and waiter details on success.
   */
  login: async (username: string, password: string): Promise<LoginResponse> => {
    return callPublicApi<LoginResponse>('/auth/waiter/login', 'POST', {
      username,
      password,
    } as LoginRequest);
  },

  /**
   * Change password when current password equals "__new__pass".
   */
  changePassword: async (dto: ChangePasswordRequest): Promise<void> => {
    await callPublicApi<void>('/auth/waiter/change-password', 'POST', dto);
  },

  /**
   * Utility: detects first-time login default password.
   */
  checkPassword: (password: string): boolean => password === '__new__pass',

  /**
   * Fetches a list of active requests for the waiter dashboard.
   * @param token The JWT authentication token.
   * @returns A promise that resolves to an array of active requests.
   */
  getActiveRequests: async (token: string): Promise<WaiterRequest[]> => {
    return callApi<WaiterRequest[]>('/waiter/requests/active', token);
  },

  /**
   * Fetch **all** requests for the waiter view (optionally filtered /
   * sorted).  Use this when the waiter taps “View Requests”.
   *
   * @param token   JWT for the waiter session.
   * @param opts    Optional query parameters:
   *                • status   – filter by request status
   *                • sort     – 'createdAt' | 'status'
   *                • search   – full-text search on content
   * @returns       Full array of requests from the server.
   */
  getAllRequests: async (
    token: string,
    opts: {
      status?: RequestStatus | 'all';
      sort?: 'createdAt' | 'status';
      search?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<WaiterRequest[]> => {
    const params = new URLSearchParams();
    if (opts.status && opts.status !== 'all') params.append('status', opts.status);
    if (opts.sort) params.append('sort', opts.sort);
    if (opts.search) params.append('search', opts.search);
    if (opts.page) params.append('page', String(opts.page));
    if (opts.pageSize) params.append('pageSize', String(opts.pageSize));

    const qs = params.toString() ? `?${params.toString()}` : '';
    console.log(`Fetching all requests with query: ${qs}`);
    return callApi<WaiterRequest[]>(`/waiter/requests${qs}`, token);
  },

  /**
   * Updates the status of a specific request.
   * @param requestId The ID of the request to update.
   * @param newStatus The new status for the request.
   * @param token The JWT authentication token.
   * @returns A promise that resolves to the updated request.
   */
  updateRequestStatus: async (
    requestId: string,
    newStatus: UpdateRequestStatusDto['status'],
    token: string,
  ): Promise<WaiterRequest> => {
    return callApi<WaiterRequest>(
      `/waiter/requests/${requestId}/status`,
      token,
      'PUT',
      { status: newStatus },
    );
  },

  /**
   * Fetches a summary of open and closed requests.
   * @param token The JWT authentication token.
   * @returns A promise that resolves to an object with open and closed request counts.
   */
  getRequestsSummary: async (token: string): Promise<RequestsSummary> => {
    return callApi<RequestsSummary>('/waiter/requests/summary', token);
  },

  /**
   * Fetches a summary of reviews (average rating and total count).
   * @param token The JWT authentication token.
   * @returns A promise that resolves to an object with average rating and total reviews.
   */
  getReviewsSummary: async (token: string): Promise<ReviewsSummary> => {
    return callApi<ReviewsSummary>('/waiter/reviews/summary', token);
  },

  /**
   * Fetches a paginated list of reviews.
   * @param token The JWT authentication token.
   * @param page The page number to retrieve (defaults to 1).
   * @param pageSize The number of reviews per page (defaults to 10).
   * @returns A promise that resolves to an array of reviews.
   */
  getPaginatedReviews: async (
    token: string,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<Review[]> => {
    return callApi<Review[]>(`/waiter/reviews?page=${page}&pageSize=${pageSize}`, token);
  },

  /**
   * Fetches AI analysis of waiter performance for today.
   * @param token The JWT authentication token.
   * @returns A promise that resolves to the AI analysis text.
   */
  getAIAnalysis: async (token: string): Promise<AIAnalysisResponse> => {
    return callApi<AIAnalysisResponse>('/waiter/ai/performance-today', token);
  },
};
