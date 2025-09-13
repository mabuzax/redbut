/**
 * Utility functions for JWT token handling
 */

/**
 * Decode JWT token payload without verification
 * Note: This is for client-side expiry checking only, not for security
 */
export function decodeJWT(token: string): any | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 * @param token JWT token string
 * @returns true if expired, false if still valid, null if can't determine
 */
export function isTokenExpired(token: string): boolean | null {
  try {
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) {
      return null; // Can't determine expiry
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error checking token expiry:', error);
    return null;
  }
}

/**
 * Get time until token expires in seconds
 * @param token JWT token string
 * @returns seconds until expiry, null if can't determine
 */
export function getTokenTimeToExpiry(token: string): number | null {
  try {
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) {
      return null;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp - currentTime;
  } catch (error) {
    console.error('Error getting token expiry time:', error);
    return null;
  }
}