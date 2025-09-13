-- Drop request_status_config table as it's no longer needed
-- Status transitions are now handled locally in the frontend applications

DROP TABLE IF EXISTS "request_status_config";
