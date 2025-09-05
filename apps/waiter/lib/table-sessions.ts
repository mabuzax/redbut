/**
 * Utility functions for managing multiple table sessions in localStorage
 */

export interface TableSession {
  sessionId: string;
  tableNumber: number;
  waiterId: string;
  qrCodeUrl: string;
  createdAt: string;
  orderCount?: number; // Optional field for order count
  requestCount?: number; // Optional field for request count
}

const STORAGE_KEY = 'redBut_table_sessions';
const OLD_STORAGE_KEY = 'redBut_table_session'; // For migration

/**
 * Migrate old single session format to new multiple sessions format
 */
function migrateOldSession(): void {
  try {
    const oldSession = localStorage.getItem(OLD_STORAGE_KEY);
    if (oldSession && !localStorage.getItem(STORAGE_KEY)) {
      // Create a minimal session object from the old sessionId
      const migrationSession: TableSession = {
        sessionId: oldSession,
        tableNumber: 0, // Unknown table number
        waiterId: 'unknown', // Unknown waiter ID
        qrCodeUrl: `${process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000'}?session=${oldSession}`,
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify([migrationSession]));
      localStorage.removeItem(OLD_STORAGE_KEY);
      console.log('Migrated old table session to new format');
    }
  } catch (error) {
    console.error('Error migrating old session:', error);
  }
}

/**
 * Get all table sessions from localStorage
 */
export function getTableSessions(): TableSession[] {
  try {
    // Run migration first
    migrateOldSession();
    
    const stored = localStorage.getItem(STORAGE_KEY);
    console.log('getTableSessions: Raw stored data:', stored);
    if (!stored) {
      console.log('getTableSessions: No data found in localStorage');
      return [];
    }
    
    const sessions = JSON.parse(stored);
    console.log('getTableSessions: Parsed sessions:', sessions);
    const result = Array.isArray(sessions) ? sessions : [];
    console.log('getTableSessions: Returning sessions:', result);
    return result;
  } catch (error) {
    console.error('Error reading table sessions from localStorage:', error);
    return [];
  }
}

/**
 * Add a new table session to localStorage
 */
export function addTableSession(session: TableSession): void {
  try {
    console.log('addTableSession: Adding session:', session);
    const sessions = getTableSessions();
    console.log('addTableSession: Current sessions before adding:', sessions);
    
    // Check if session already exists (by sessionId)
    const existingIndex = sessions.findIndex(s => s.sessionId === session.sessionId);
    
    if (existingIndex >= 0) {
      // Update existing session
      console.log('addTableSession: Updating existing session at index:', existingIndex);
      sessions[existingIndex] = session;
    } else {
      // Add new session
      console.log('addTableSession: Adding new session');
      sessions.push(session);
    }
    
    console.log('addTableSession: Sessions after adding:', sessions);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    console.log('addTableSession: Saved to localStorage with key:', STORAGE_KEY);
  } catch (error) {
    console.error('Error saving table session to localStorage:', error);
  }
}

/**
 * Remove a table session from localStorage
 */
export function removeTableSession(sessionId: string): void {
  try {
    const sessions = getTableSessions();
    const filteredSessions = sessions.filter(s => s.sessionId !== sessionId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredSessions));
  } catch (error) {
    console.error('Error removing table session from localStorage:', error);
  }
}

/**
 * Get a specific table session by sessionId
 */
export function getTableSession(sessionId: string): TableSession | null {
  const sessions = getTableSessions();
  return sessions.find(s => s.sessionId === sessionId) || null;
}

/**
 * Get table sessions for a specific table number
 */
export function getTableSessionsByTableNumber(tableNumber: number): TableSession[] {
  const sessions = getTableSessions();
  return sessions.filter(s => s.tableNumber === tableNumber);
}

/**
 * Get table sessions for a specific waiter
 */
export function getTableSessionsByWaiterId(waiterId: string): TableSession[] {
  const sessions = getTableSessions();
  return sessions.filter(s => s.waiterId === waiterId);
}

/**
 * Clear all table sessions from localStorage
 */
export function clearAllTableSessions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing table sessions from localStorage:', error);
  }
}

/**
 * Update an existing table session
 */
export function updateTableSession(sessionId: string, updates: Partial<TableSession>): void {
  try {
    const sessions = getTableSessions();
    const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
    
    if (sessionIndex >= 0) {
      sessions[sessionIndex] = { ...sessions[sessionIndex], ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  } catch (error) {
    console.error('Error updating table session in localStorage:', error);
  }
}
