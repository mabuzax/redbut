import { clearRedButLocalStorage } from './redbut-localstorage';

/**
 * Wrapper around fetch that automatically handles 401 errors by clearing localStorage and redirecting
 * Use this for any fetch calls that include authentication headers
 */
export async function fetchWithAuth(url: string, options?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    // If we get a 401, the token is expired/invalid - clear all session data
    if (response.status === 401) {
      console.error('Authentication failed (401) - JWT token expired or invalid, clearing all session data');
      clearRedButLocalStorage();
      // Redirect to login/main page
      window.location.href = '/';
      throw new Error('Authentication failed - redirecting to login');
    }
    
    return response;
  } catch (error) {
    // Re-throw any errors
    throw error;
  }
}
