// Utility to clear all localStorage items prefixed with 'redBut_' and AI analysis cache
export function clearRedButLocalStorage() {
  if (typeof window === 'undefined') return;
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('redBut_')) {
      keysToRemove.push(key);
    }
  }
  
  // Also clear AI analysis cache
  keysToRemove.push('waiter_ai_analysis', 'waiter_ai_analysis_timestamp');
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
}
