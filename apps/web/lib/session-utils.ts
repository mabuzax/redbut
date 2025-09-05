/**
 * Utility functions for handling session IDs
 */

export interface ParsedSessionId {
  uuid: string;
  tableNumber: number;
  waiterId: string;
}

/**
 * Parse a session ID to extract components
 * Session ID format: UUID_tableNumber_waiterId
 */
export function parseSessionId(sessionId: string): ParsedSessionId | null {
  try {
    const parts = sessionId.split('_');
    if (parts.length !== 3) {
      return null;
    }

    const [uuid, tableNumberStr, waiterId] = parts;
    const tableNumber = parseInt(tableNumberStr, 10);

    if (isNaN(tableNumber)) {
      return null;
    }

    return {
      uuid,
      tableNumber,
      waiterId
    };
  } catch (error) {
    console.error('Error parsing session ID:', error);
    return null;
  }
}

/**
 * Create a session ID from components
 */
export function createSessionId(tableNumber: number, waiterId: string): string {
  const uuid = crypto.randomUUID();
  return `${uuid}_${tableNumber}_${waiterId}`;
}

/**
 * Get waiter ID from session ID stored in localStorage
 */
export function getWaiterIdFromLocalStorage(): string | null {
  try {
    const sessionId = localStorage.getItem('redBut_table_session');
    if (!sessionId) return null;

    const parsed = parseSessionId(sessionId);
    return parsed?.waiterId || null;
  } catch (error) {
    console.error('Error getting waiter ID from localStorage:', error);
    return null;
  }
}

/**
 * Get table number from session ID stored in localStorage
 */
export function getTableNumberFromLocalStorage(): number | null {
  try {
    const sessionId = localStorage.getItem('redBut_table_session');
    if (!sessionId) return null;

    const parsed = parseSessionId(sessionId);
    return parsed?.tableNumber || null;
  } catch (error) {
    console.error('Error getting table number from localStorage:', error);
    return null;
  }
}
