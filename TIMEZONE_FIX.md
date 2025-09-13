# Database Timezone Synchronization Fix

This document outlines the steps taken to fix timezone discrepancies between the database and application.

## Problem
There was a timezone discrepancy between the PostgreSQL database and the Node.js application, causing data to display incorrectly due to timezone differences.

## Solution

### 1. Docker Configuration Updates
Updated `docker-compose.yml` to set timezone for both database and API containers:

```yaml
# Database container
environment:
  TZ: UTC
  PGTZ: UTC

# API container  
environment:
  TZ: UTC
```

### 2. Application Configuration
Updated `apps/api/src/main.ts` to set timezone at application startup:

```typescript
// Set timezone to UTC for consistent date handling
process.env.TZ = 'UTC';
```

### 3. Date Utility Service
Created `apps/api/src/common/utils/date.util.ts` for consistent date handling:

- All date operations use UTC timezone
- Centralized date range calculations
- Proper timezone conversion utilities using `date-fns-tz`

### 4. Service Updates
Updated services to use the DateUtil:
- `AdminAnalyticsService` - Uses DateUtil for date range calculations
- `WaiterService` - Uses DateUtil for consistent date handling

### 5. Database Timezone Configuration
Created `setup-db-timezone.sql` to configure PostgreSQL timezone:

```sql
SET timezone = 'UTC';
```

## Implementation Steps

### For Docker Environment:
1. Stop containers: `docker-compose down`
2. Rebuild with timezone settings: `docker-compose up --build`
3. Run timezone setup SQL (optional): Connect to database and run `setup-db-timezone.sql`

### For Local Development:
1. Install timezone package: `npm install date-fns-tz`
2. Set environment variable: `export TZ=UTC` (Linux/Mac) or `set TZ=UTC` (Windows)
3. Restart the API server

### Database Timezone Verification:
Connect to PostgreSQL and run:
```sql
SHOW timezone;
SELECT current_setting('TIMEZONE');
SELECT now() AT TIME ZONE 'UTC' as utc_time, now() as local_time;
```

## Key Changes Made

1. **Consistent UTC Usage**: All timestamps are now handled in UTC
2. **Centralized Date Logic**: DateUtil provides consistent date operations
3. **Container Timezone**: Docker containers use UTC timezone
4. **Application Timezone**: Node.js application forced to UTC timezone
5. **Database Timezone**: PostgreSQL configured for UTC

## Validation

After implementing these changes:
1. Check that database queries return consistent dates
2. Verify that analytics date ranges work correctly
3. Confirm that API responses show dates in expected timezone
4. Test that date filtering works as expected

## Files Modified

- `docker-compose.yml` - Added timezone environment variables
- `apps/api/src/main.ts` - Set application timezone to UTC
- `apps/api/src/common/utils/date.util.ts` - New date utility service
- `apps/api/src/admin/admin-analytics.service.ts` - Updated to use DateUtil
- `apps/api/src/waiter/waiter.service.ts` - Updated to use DateUtil
- `setup-db-timezone.sql` - Database timezone configuration script

## Future Considerations

If you need to support multiple timezones:
1. Store user timezone preferences
2. Convert UTC dates to user's local timezone for display
3. Always store dates in UTC in the database
4. Use DateUtil timezone conversion functions
