-- Update existing request logs to set appropriate actor values
-- This script sets the actor field for existing logs based on the action content

-- Set actor to 'user' for request creation logs
UPDATE requests_log 
SET actor = 'user' 
WHERE action LIKE '%New request created%' OR action LIKE '%Request status changed from%' AND actor = 'system';

-- Set actor to 'waiter' for status change logs that indicate waiter actions
UPDATE requests_log 
SET actor = 'waiter' 
WHERE (action LIKE '%Status changed from New to%' 
   OR action LIKE '%Status changed from Acknowledged to%'
   OR action LIKE '%Status changed from InProgress to%'
   OR action LIKE '%Acknowledged%'
   OR action LIKE '%to Done%'
   OR action LIKE '%to Completed%'
   OR action LIKE '%to InProgress%') 
   AND actor = 'system';

-- Keep 'system' for any other automated logs
-- (actor field already defaults to 'system' for new entries)
