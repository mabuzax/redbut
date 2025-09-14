# Server-Sent Events (SSE) Implementation

This document describes the real-time notification system implemented using Server-Sent Events (SSE) for one-way server-to-client communication.

## Overview

The SSE implementation provides real-time notifications for:
- Request status updates
- Order status updates  
- Waiter session transfers
- Cache refresh triggers

## Architecture

### Core Components

1. **SSEService** - Core SSE functionality with connection management
2. **SSEController** - HTTP endpoints for establishing SSE connections
3. **NotificationService** - High-level notification interface
4. **CacheRefreshService** - Intelligent cache invalidation with debouncing

### Security

- JWT token validation required for all SSE connections
- Session-based access control (users can only access their own session)
- Waiter-based access control (waiters can only access their own notifications)

## API Endpoints

### Session Notifications (for customers)
```
GET /sse/session/{sessionId}
Headers: Authorization: Bearer <jwt_token>
```

### Waiter Notifications
```
GET /sse/waiter/{waiterId}  
Headers: Authorization: Bearer <jwt_token>
```

### Health Check
```
GET /sse/health
```

## Event Types

### Request Updates
```json
{
  "type": "request_update",
  "data": {
    "sessionId": "session-123",
    "waiterId": "waiter-456", 
    "requestId": "req-789",
    "tableNumber": 5,
    "status": "Completed",
    "previousStatus": "InProgress",
    "message": "Your request has been completed - Table 5",
    "requiresRefresh": true,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Request Status Values:**
- `New` - Request has been received
- `Acknowledged` - Request acknowledged by waiter
- `InProgress` - Request is being handled
- `Completed` - Request has been completed
- `OnHold` - Request is temporarily on hold
- `Cancelled` - Request has been cancelled
- `Done` - Request is complete

### Order Updates
```json
{
  "type": "order_update",
  "data": {
    "sessionId": "session-123",
    "waiterId": "waiter-456",
    "orderId": "order-789", 
    "tableNumber": 5,
    "status": "Complete",
    "previousStatus": "InProgress",
    "message": "Your order has been completed (3 items) - Table 5",
    "requiresRefresh": true,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Order Status Values:**
- `New` - Order has been received
- `Acknowledged` - Order acknowledged and being prepared
- `InProgress` - Order is being prepared in kitchen
- `Complete` - Order has been completed
- `Delivered` - Order delivered to table
- `Paid` - Order paid and complete
- `Cancelled` - Order has been cancelled
- `Rejected` - Order could not be fulfilled

### Session Transfers
```json
{
  "type": "session_transfer",
  "data": {
    "sessionId": "session-123",
    "waiterId": "waiter-new",
    "tableNumber": 5,
    "message": "Your waiter has been updated (shift change) - Table 5",
    "requiresRefresh": true,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Cache Refresh
```json
{
  "type": "cache_refresh", 
  "data": {
    "message": "Cache refresh required: Request req-789 status changed to completed",
    "requiresRefresh": true,
    "affectedData": ["requests", "analytics"],
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Integration Points

### Automatic Notifications

The following waiter service methods automatically emit SSE notifications:

- `updateRequestStatus()` - Notifies when request status changes
- `updateOrderStatus()` - Notifies when order status changes  
- `transferSessions()` - Notifies when sessions are transferred between waiters

### Cache Refresh Triggers

The cache refresh service intelligently batches and debounces refresh events:

- **High Priority** (200ms delay): Request/order status changes
- **Medium Priority** (1000ms delay): Analytics updates
- **Low Priority** (5000ms delay): General data updates

### Manual Usage

```typescript
// Inject services
constructor(
  private readonly notificationService: NotificationService,
  private readonly cacheRefreshService: CacheRefreshService,
) {}

// Send notification
this.notificationService.notifyRequestUpdate({
  sessionId: 'session-123',
  waiterId: 'waiter-456', 
  requestId: 'req-789',
  tableNumber: 5,
  status: 'completed',
  previousStatus: 'in_progress'
});

// Trigger cache refresh
this.cacheRefreshService.triggerRequestsRefresh({
  sessionId: 'session-123',
  waiterId: 'waiter-456',
  requestIds: ['req-789'],
  reason: 'Request status updated',
  priority: 'high'
});
```

## Client Implementation

### JavaScript/TypeScript
```javascript
const eventSource = new EventSource('/sse/session/session-123', {
  headers: {
    'Authorization': 'Bearer ' + jwtToken
  }
});

eventSource.addEventListener('request_update', (event) => {
  const data = JSON.parse(event.data);
  console.log('Request update:', data);
  
  if (data.requiresRefresh) {
    // Refresh relevant UI components or cache
    refreshRequestsData();
  }
});

eventSource.addEventListener('order_update', (event) => {
  const data = JSON.parse(event.data);
  console.log('Order update:', data);
  
  if (data.requiresRefresh) {
    refreshOrdersData();
  }
});

eventSource.onerror = (error) => {
  console.error('SSE connection error:', error);
};
```

## Monitoring & Debugging

### Connection Stats
```
GET /sse/health
```
Returns active connection counts and health status.

### Logs
The implementation provides comprehensive logging:
- Connection establishment/closure
- Event emissions
- Cache refresh operations
- Error conditions

### Environment Variables
No additional environment variables required - uses existing JWT configuration.

## Performance Considerations

- **Connection Limits**: Monitor active SSE connections
- **Memory Usage**: Connections are cleaned up automatically on disconnect
- **Debouncing**: Cache refresh events are batched to prevent spam
- **Heartbeat**: 30-second heartbeat keeps connections alive

## Error Handling

- **JWT Validation**: Invalid tokens return 401 Unauthorized
- **Access Control**: Unauthorized access returns 403 Forbidden  
- **Connection Cleanup**: Automatic cleanup on client disconnect
- **Retry Logic**: Clients should implement exponential backoff for reconnection