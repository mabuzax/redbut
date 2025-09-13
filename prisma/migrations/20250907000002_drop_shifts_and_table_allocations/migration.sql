-- Drop shifts and table_allocations tables as they are no longer needed
-- Table allocation is now handled differently without shift dependencies

DROP TABLE IF EXISTS "table_allocations";
DROP TABLE IF EXISTS "shifts";
