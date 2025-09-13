/**
 * Centralized API utility with session validation
 * All backend API calls should go through this utility
 */

import { clearRedButLocalStorage } from './redbut-localstorage';
import { ServiceAnalysisRequest } from '../types/service-analysis';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiRequestOptions extends RequestInit {
  skipSessionValidation?: boolean;
}

/**
 * Validates if the current session exists in the users table
 */
async function validateSession(): Promise<boolean> {
  try {
    const sessionId = localStorage.getItem('redBut_table_session');
    if (!sessionId) {
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/validate-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });

    return response.ok;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}

/**
 * Handles session invalidation by clearing localStorage and refreshing the page
 */
function handleSessionInvalidation(): void {
  clearRedButLocalStorage();
  localStorage.removeItem('redBut_jwt_token'); // Clear JWT token as well
  window.location.reload();
}

/**
 * Gets the JWT token from localStorage or validates session to get one
 */
async function getJWTToken(): Promise<string | null> {
  try {
    // First try to get existing token
    const existingToken = localStorage.getItem('redBut_jwt_token');
    if (existingToken) {
      // TODO: Could add token expiry validation here
      return existingToken;
    }

    // If no token, validate session to get one
    const sessionId = localStorage.getItem('redBut_table_session');
    if (!sessionId) {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/validate-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.token) {
      localStorage.setItem('redBut_jwt_token', data.token);
      return data.token;
    }

    return null;
  } catch (error) {
    console.error('Failed to get JWT token:', error);
    return null;
  }
}

/**
 * Enhanced fetch function with session validation
 * Checks session validity before making API calls
 */
export async function apiRequest(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<Response> {
  const { skipSessionValidation = false, ...fetchOptions } = options;

  // Skip session validation for specific endpoints like login/auth
  if (!skipSessionValidation) {
    const isValidSession = await validateSession();
    if (!isValidSession) {
      handleSessionInvalidation();
      throw new Error('Session invalid - redirecting');
    }
  }

  // Construct full URL if endpoint is relative
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  // Get JWT token for API authentication
  const jwtToken = await getJWTToken();
  
  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Add session ID to headers if available
  const sessionId = localStorage.getItem('redBut_table_session');
  if (sessionId) {
    headers['X-Session-ID'] = sessionId;
  }

  // Add JWT token for protected endpoints
  if (jwtToken) {
    headers['Authorization'] = `Bearer ${jwtToken}`;
  }

  fetchOptions.headers = headers;

  try {
    const response = await fetch(url, fetchOptions);
    
    // If we get a 401, the JWT token is expired/invalid - clear all session data
    if (response.status === 401) {
      console.error('Authentication failed (401) - JWT token expired or invalid, clearing session');
      handleSessionInvalidation();
      throw new Error('Authentication invalid - redirecting');
    }

    // Also handle 403 for completeness (forbidden)
    if (response.status === 403) {
      console.error('Access forbidden (403), clearing session');
      handleSessionInvalidation();
      throw new Error('Access forbidden - redirecting');
    }

    return response;
  } catch (error) {
    // If fetch fails, it might be a network issue, not session
    throw error;
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: (endpoint: string, options?: ApiRequestOptions) =>
    apiRequest(endpoint, { ...options, method: 'GET' }),

  post: (endpoint: string, data?: any, options?: ApiRequestOptions) =>
    apiRequest(endpoint, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: (endpoint: string, data?: any, options?: ApiRequestOptions) =>
    apiRequest(endpoint, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: (endpoint: string, data?: any, options?: ApiRequestOptions) =>
    apiRequest(endpoint, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: (endpoint: string, options?: ApiRequestOptions) =>
    apiRequest(endpoint, { ...options, method: 'DELETE' }),
};

/**
 * For authentication-related calls that shouldn't trigger session validation
 */
export const authApi = {
  post: (endpoint: string, data?: any, options?: ApiRequestOptions) =>
    apiRequest(endpoint, {
      ...options,
      method: 'POST',
      skipSessionValidation: true,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),
};

export { API_BASE_URL, getJWTToken };

/**
 * Service Analysis API functions
 */
export const serviceAnalysisApi = {
  submitAnalysis: async (data: ServiceAnalysisRequest): Promise<any> => {
    return api.post('/api/v1/service-analysis', data, { skipSessionValidation: true });
  },

  getAnalysisBySession: async (sessionId: string): Promise<any> => {
    return api.get(`/api/v1/service-analysis/session/${sessionId}`);
  },

  getAnalysisByWaiter: async (waiterId: string): Promise<any> => {
    return api.get(`/api/v1/service-analysis/waiter/${waiterId}`);
  },

  getAllAnalysis: async (): Promise<any> => {
    return api.get('/api/v1/service-analysis');
  },
};
