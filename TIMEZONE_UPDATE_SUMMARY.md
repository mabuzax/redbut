# Timezone Configuration Update - Africa/Johannesburg (GMT+2)

## Summary
Updated the entire RedBut application stack to use Africa/Johannesburg timezone (GMT+2) instead of UTC.

## Changes Made

### 1. Docker Configuration (`docker-compose.yml`)
- **Database (PostgreSQL)**: Set `TZ=Africa/Johannesburg` and `PGTZ=Africa/Johannesburg`
- **API Service**: Set `TZ=Africa/Johannesburg`
- **Web App**: Set `TZ=Africa/Johannesburg`
- **Admin App**: Set `TZ=Africa/Johannesburg`
- **Waiter App**: Set `TZ=Africa/Johannesburg`

### 2. Backend API (`/api`)
#### DateUtil Class (`apps/api/src/common/utils/date.util.ts`)
- Changed `DEFAULT_TIMEZONE` from `'UTC'` to `'Africa/Johannesburg'`
- Updated all date calculation methods to use Johannesburg timezone
- Updated comments to reflect Africa/Johannesburg timezone usage
- Enhanced timezone conversion utilities

#### Main Application (`apps/api/src/main.ts`)
- Already using `DateUtil.initializeTimezone()` which now defaults to Africa/Johannesburg

### 3. Database Configuration
#### SQL Configuration (`setup-db-timezone.sql`)
- Updated PostgreSQL timezone setting from UTC to Africa/Johannesburg
- Updated sample queries to use Africa/Johannesburg timezone
- Updated configuration comments

### 4. Frontend Applications

#### Web App (`/web`)
- **Date Formatting** (`apps/web/components/orders/MyOrders.tsx`):
  - Added `timeZone: 'Africa/Johannesburg'` to date formatting options
- **Timezone Utility** (`apps/web/lib/timezone.ts`):
  - Created centralized timezone utility with Johannesburg timezone constants
  - Provided helper functions for consistent date formatting

#### Waiter App (`/waiter`)
- **Order Management** (`apps/waiter/components/orders/OrderManagement.tsx`):
  - Added `timeZone: 'Africa/Johannesburg'` to date formatting
- **Session Orders** (`apps/waiter/components/orders/SessionOrders.tsx`):
  - Added `timeZone: 'Africa/Johannesburg'` to date formatting
- **Timezone Utility** (`apps/waiter/lib/timezone.ts`):
  - Created centralized timezone utility with Johannesburg timezone constants

#### Admin App (`/admin`)
- **Shifts Component** (`apps/admin/components/shifts/ShiftsComponent.tsx`):
  - Added `timeZone: 'Africa/Johannesburg'` to date and time formatting functions
- **Timezone Utility** (`apps/admin/lib/timezone.ts`):
  - Created centralized timezone utility with Johannesburg timezone constants

## Implementation Details

### Timezone Handling Strategy
1. **Database Storage**: Dates continue to be stored in UTC in the database
2. **Application Logic**: All date calculations now use Africa/Johannesburg timezone
3. **Display**: All frontend date displays use Africa/Johannesburg timezone
4. **API Responses**: Backend converts dates to Johannesburg timezone before sending to frontend

### Environment Variables
All Docker services now have `TZ=Africa/Johannesburg` environment variable set, ensuring:
- Node.js applications use correct timezone
- PostgreSQL uses correct timezone for operations
- System-level date operations use correct timezone

### Frontend Utilities
Created `timezone.ts` utility files in each frontend app (`/web`, `/waiter`, `/admin`) with:
- `JOHANNESBURG_TIMEZONE` constant
- `formatDateForDisplay()` function
- `formatDateTime()` function  
- `formatTime()` function
- `formatFullDate()` function

## Verification Steps
1. Check Docker environment variables: `TZ=Africa/Johannesburg` set for all services
2. Verify PostgreSQL timezone: Run `SHOW timezone;` should return `Africa/Johannesburg`
3. Check API DateUtil: `DEFAULT_TIMEZONE = 'Africa/Johannesburg'`
4. Verify frontend formatting: All date displays should show Johannesburg time
5. Test database operations: All date calculations should use Johannesburg timezone

## Migration Notes
- **No data migration required**: Existing UTC timestamps in database remain valid
- **Backward compatibility**: All existing date handling continues to work
- **Gradual adoption**: Frontend utilities can be adopted component by component
- **Testing**: Verify that business hours, analytics, and reporting align with South African time

## Next Steps
1. Deploy updated docker-compose.yml configuration
2. Run database timezone configuration: `\i setup-db-timezone.sql`
3. Test date/time displays across all applications
4. Monitor analytics and reporting for correct timezone handling
5. Update any scheduled tasks or cron jobs to use Johannesburg timezone

## Files Modified
- `docker-compose.yml`
- `apps/api/src/common/utils/date.util.ts`
- `setup-db-timezone.sql`
- `apps/web/components/orders/MyOrders.tsx`
- `apps/web/lib/timezone.ts` (new)
- `apps/waiter/components/orders/OrderManagement.tsx`
- `apps/waiter/components/orders/SessionOrders.tsx`
- `apps/waiter/lib/timezone.ts` (new)
- `apps/admin/components/shifts/ShiftsComponent.tsx`
- `apps/admin/lib/timezone.ts` (new)
