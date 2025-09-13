-- Configure PostgreSQL timezone to Africa/Johannesburg for consistent date handling
SET timezone = 'Africa/Johannesburg';

-- Show current timezone setting
SHOW timezone;

-- Alternative queries to check timezone configuration
SELECT current_setting('TIMEZONE') as current_timezone;
SELECT now() AT TIME ZONE 'Africa/Johannesburg' as johannesburg_time, now() as local_time;

-- Update PostgreSQL configuration to persist timezone setting
-- This would typically be done in postgresql.conf:
-- timezone = 'Africa/Johannesburg'
-- log_timezone = 'Africa/Johannesburg'
