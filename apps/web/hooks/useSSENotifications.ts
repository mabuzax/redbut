import { useEffect, useRef, useState, useCallback } from 'react';
// Removed toast import since we're using custom notifications

interface SSENotification {
  type: 'request_update' | 'order_update' | 'session_transfer' | 'cache_refresh';
  title?: string;
  message?: string;
  timestamp?: string;
  requiresRefresh?: boolean;
  data: {
    sessionId?: string;
    waiterId?: string;
    requestId?: string;
    orderId?: string;
    tableNumber?: number;
    status?: string;
    previousStatus?: string;
    message?: string;
    requiresRefresh?: boolean;
    timestamp: string;
    metadata?: Record<string, any>;
    reason?: string;
    affectedData?: any[];
    eventCount?: number;
    priority?: string;
  };
}

interface UseSSENotificationsOptions {
  sessionId?: string;
  token?: string;
  enabled?: boolean;
  onNotification?: (notification: SSENotification) => void;
  onError?: (error: Event) => void;
}

export function useSSENotifications({
  sessionId,
  token,
  enabled = true,
  onNotification,
  onError
}: UseSSENotificationsOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Connect to SSE
  const connect = useCallback(() => {
    console.log('🔄 SSE connect called with:', { enabled, sessionId, token: token ? 'present' : 'missing' });
    
    if (!enabled || !sessionId || !token) {
      console.log('⚠️ SSE not connecting - missing requirements:', { enabled, sessionId: !!sessionId, token: !!token });
      return;
    }

    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return; // Already connected
    }

    cleanup();

    try {
      const url = `${API_BASE_URL}/api/v1/sse/session/${sessionId}`;
      
      // Note: EventSource doesn't support custom headers directly
      // We'll need to pass the token as a query parameter or use a different approach
      const urlWithAuth = `${url}?token=${encodeURIComponent(token)}`;
      
      console.log('🔄 SSE connecting to URL:', url);
      console.log('🔄 SSE session ID being used:', sessionId);
      
      const eventSource = new EventSource(urlWithAuth);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connection opened');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const notification: SSENotification = JSON.parse(event.data);
          console.log('SSE notification received:', notification);
          
          // Show toast notification based on notification type
          if (notification.type === 'request_update' && notification.message) {
            console.log('🍞 Request update notification received:', notification.message);
          } else if (notification.type === 'order_update' && notification.message) {
            console.log('🍞 Order update notification received:', notification.message);
          } else if (notification.type === 'cache_refresh') {
            console.log('Cache refresh:', notification);
            // Don't show toast for cache refresh, just log it
          } else {
            console.log('🚫 Unknown notification type:', notification.type, 'message:', notification.message);
          }

          // Call custom handler if provided
          if (onNotification) {
            onNotification(notification);
          }

          // Auto-refresh if required
          if (notification.data?.requiresRefresh) {
            // Trigger a page refresh or data refetch
            window.location.reload();
          }
        } catch (error) {
          console.error('Error parsing SSE notification:', error);
        }
      };

      // Listen for specific event types
      eventSource.addEventListener('request_update', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Request update:', data);
          // Removed toast - using custom notifications instead
          
          if (onNotification) {
            onNotification({ type: 'request_update', data });
          }
        } catch (error) {
          console.error('Error parsing request update:', error);
        }
      });

      eventSource.addEventListener('order_update', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Order update:', data);
          // Removed toast - using custom notifications instead
          
          if (onNotification) {
            onNotification({ type: 'order_update', data });
          }
        } catch (error) {
          console.error('Error parsing order update:', error);
        }
      });

      eventSource.addEventListener('session_transfer', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Session transfer:', data);
          // Removed toast - using custom notifications instead
          
          if (onNotification) {
            onNotification({ type: 'session_transfer', data });
          }
        } catch (error) {
          console.error('Error parsing session transfer:', error);
        }
      });

      eventSource.addEventListener('cache_refresh', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Cache refresh:', data);
          
          if (data.requiresRefresh) {
            // Force data refresh without full page reload
            window.dispatchEvent(new CustomEvent('sse-cache-refresh', { detail: data }));
          }
          
          if (onNotification) {
            onNotification({ type: 'cache_refresh', data });
          }
        } catch (error) {
          console.error('Error parsing cache refresh:', error);
        }
      });

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setIsConnected(false);
        
        if (onError) {
          onError(error);
        }

        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000; // Exponential backoff
          setConnectionError(`Connection lost. Reconnecting in ${delay / 1000}s...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        } else {
          setConnectionError('Connection failed after multiple attempts. Please refresh the page.');
        }
      };

    } catch (error) {
      console.error('Error creating SSE connection:', error);
      setConnectionError('Failed to establish notification connection');
    }
  }, [enabled, sessionId, token, onNotification, onError, API_BASE_URL, cleanup]);

  // Initialize connection
  useEffect(() => {
    console.log('🔄 SSE useEffect triggered with:', { enabled, sessionId: !!sessionId, token: !!token });
    
    if (enabled && sessionId && token) {
      console.log('🚀 Starting SSE connection...');
      connect();
    } else {
      console.log('❌ SSE connection skipped - requirements not met');
    }

    return cleanup;
  }, [enabled, sessionId, token, connect, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isConnected,
    connectionError,
    reconnect: connect,
    disconnect: cleanup
  };
}