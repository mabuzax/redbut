import { RequestStatus } from './types';

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
  status: string;
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
 * Service Analysis data structure from service_analysis table
 */
export interface ServiceAnalysis {
  id: string;
  sessionId: string;
  userId: string;
  waiterId: string;
  rating: number;
  analysis: {
    happiness: string;
    reason: string;
    suggested_improvement: string;
    overall_sentiment: string;
  };
  createdAt: string;
  user?: {
    id: string;
    tableNumber: number;
  };
}

/**
 * Summary of service analysis reviews for a waiter
 */
export interface ServiceAnalysisSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    rating: number;
    count: number;
  }[];
}

/**
 * AI performance analysis response.
 */
export interface AIAnalysisResponse {
  overall_sentiment: string;
  happiness_breakdown: Record<string, string>;
  improvement_points: string[];
  overall_analysis: string;
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
  requiresPasswordChange?: boolean;
}

export interface ChangePasswordRequest {
  userId: string;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/* -------------------------------------------------------------------------- */
/*  OTP Authentication DTOs                                                    */
/* -------------------------------------------------------------------------- */

export interface OTPGenerationRequest {
  identifier: string; // email or phone
  userType: string; // 'ADMIN' or 'WAITER'
}

export interface OTPGenerationResponse {
  success: boolean;
  message: string;
  username: string;
}

export interface OTPVerificationRequest {
  identifier: string; // email or phone  
  userType: string; // 'ADMIN' or 'WAITER'
  code: string; // 6-digit OTP
}

export interface OTPVerificationResponse {
  success: boolean;
  message?: string;
  waiter?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    userType: string;
  };
  token?: string;
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
  console.log(`Token being used: ${token ? token.substring(0, 20) + '...' : 'NO TOKEN'}`);
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
    
    // If we get a 401, the token is invalid - clear the session
    if (response.status === 401) {
      // Clear invalid auth data
      localStorage.removeItem("redBut_waiterSession");
      localStorage.removeItem("redBut_token");
      // Optionally redirect to login
      window.location.href = '/';
    }
    
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

  /* ---------------------------------------------------------------------- */
  /*  OTP Authentication                                                     */
  /* ---------------------------------------------------------------------- */

  /**
   * Generate OTP for waiter authentication.
   */
  generateOTP: async (
    emailOrPhone: string,
    userType: 'admin' | 'waiter' | 'manager'
  ): Promise<OTPGenerationResponse> => {
    return callPublicApi<OTPGenerationResponse>('/auth/otp/generate', 'POST', {
      emailOrPhone,
      userType,
    });
  },

  /**
   * Verify OTP and authenticate waiter.
   */
  verifyOTP: async (
    username: string,
    otp: string,
    userType: 'admin' | 'waiter' | 'manager'
  ): Promise<OTPVerificationResponse> => {
    return callPublicApi<OTPVerificationResponse>('/auth/otp/verify', 'POST', {
      username,
      otp,
      userType,
    });
  },

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
    newStatus: string,
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
   * Fetches a summary of service analysis reviews (average rating and total count) for the waiter.
   * @param token The JWT authentication token.
   * @returns A promise that resolves to an object with average rating and total reviews.
   */
  getReviewsSummary: async (token: string): Promise<ServiceAnalysisSummary> => {
    // Get the waiter ID from the token payload
    const payload = JSON.parse(atob(token.split('.')[1]));
    const waiterId = payload.userId;
    
    // Fetch service analysis data for this waiter
    const serviceAnalysisData = await callApi<ServiceAnalysis[]>(`/service-analysis/waiter/${waiterId}`, token);
    
    // Debug logging
    console.log('Service Analysis Data:', serviceAnalysisData);
    console.log('Ratings:', serviceAnalysisData.map(item => item.rating));
    
    // Calculate summary statistics
    const totalReviews = serviceAnalysisData.length;
    const ratingSum = serviceAnalysisData.reduce((sum, item) => sum + item.rating, 0);
    const averageRating = totalReviews > 0 ? ratingSum / totalReviews : 0;
    
    console.log('Total Reviews:', totalReviews);
    console.log('Rating Sum:', ratingSum);
    console.log('Average Rating:', averageRating);
    
    // Calculate rating distribution
    const ratingCounts = [1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: serviceAnalysisData.filter(item => item.rating === rating).length
    }));
    
    console.log('Rating Distribution:', ratingCounts);

    return {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      totalReviews,
      ratingDistribution: ratingCounts
    };
  },

  /**
   * Fetches service analysis reviews for the waiter.
   * @param token The JWT authentication token.
   * @returns A promise that resolves to an array of service analysis reviews.
   */
  getPaginatedReviews: async (
    token: string,
  ): Promise<ServiceAnalysis[]> => {
    // Get the waiter ID from the token payload
    const payload = JSON.parse(atob(token.split('.')[1]));
    const waiterId = payload.userId;
    
    return callApi<ServiceAnalysis[]>(`/service-analysis/waiter/${waiterId}`, token);
  },

  /**
   * Fetches AI analysis of waiter performance for today.
   * @param token The JWT authentication token.
   * @returns A promise that resolves to the AI analysis text.
   */
  getAIAnalysis: async (token: string): Promise<AIAnalysisResponse> => {
    return callApi<AIAnalysisResponse>('/waiter/ai/performance-today', token);
  },

  /**
   * Fetches requests for a specific session.
   * @param sessionId The session ID to get requests for.
   * @param token The JWT authentication token.
   * @returns A promise that resolves to an array of requests for the session.
   */
  getRequestsBySession: async (sessionId: string, token: string): Promise<WaiterRequest[]> => {
    return callApi<WaiterRequest[]>(`/waiter/requests/session/${sessionId}`, token);
  },

  /**
   * Fetches allowed status transitions for a request.
   * @param currentStatus The current status of the request.
   * @param token The JWT authentication token.
   * @returns A promise that resolves to an array of allowed transitions.
   */
  getRequestStatusTransitions: async (
    currentStatus: string,
    token: string
  ): Promise<{ targetStatus: string; label: string }[]> => {
    const params = new URLSearchParams({
      currentStatus,
      userRole: 'waiter'
    });
    const response = await callApi<{
      currentStatus: string;
      userRole: string;
      transitions: { targetStatus: string; label: string }[];
    }>(`/request-status-config/transitions?${params.toString()}`, token);
    return response.transitions;
  },
};
