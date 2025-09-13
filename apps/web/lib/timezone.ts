/**
 * Timezone utility for consistent date handling across the web application
 * All dates are displayed in Africa/Johannesburg timezone (GMT+2)
 */

export const JOHANNESBURG_TIMEZONE = 'Africa/Johannesburg';

/**
 * Format date for display in Johannesburg timezone
 */
export function formatDateForDisplay(
  dateString: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: JOHANNESBURG_TIMEZONE,
    ...options
  }).format(date);
}

/**
 * Format date with time for display
 */
export function formatDateTime(dateString: string): string {
  return formatDateForDisplay(dateString, {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format time only for display
 */
export function formatTime(dateString: string): string {
  return formatDateForDisplay(dateString, {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
}

/**
 * Format full date for display
 */
export function formatFullDate(dateString: string): string {
  return formatDateForDisplay(dateString, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
