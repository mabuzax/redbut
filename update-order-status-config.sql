-- Update Order Status Configuration based on requirements
-- Clear existing configuration
DELETE FROM "order_status_config";

-- Client/Web User Configuration with NOW() for timestamps
-- New: Can cancel only
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'New', 'New', 'client', 'New', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'New', 'Cancelled', 'client', 'Cancel', NOW(), NOW());

-- Cancelled: No dropdown options (view only)
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Cancelled', 'Cancelled', 'client', 'Cancelled', NOW(), NOW());

-- Acknowledged: Can cancel
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Acknowledged', 'Acknowledged', 'client', 'Acknowledged', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Acknowledged', 'Cancelled', 'client', 'Cancel', NOW(), NOW());

-- InProgress: No dropdown (view only)
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'InProgress', 'InProgress', 'client', 'In Progress', NOW(), NOW());

-- Completed: No dropdown (view only)
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Complete', 'Complete', 'client', 'Completed', NOW(), NOW());

-- Delivered: Can reject
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Delivered', 'Delivered', 'client', 'Delivered', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Delivered', 'Cancelled', 'client', 'Reject', NOW(), NOW());

-- Paid: No dropdown (view only)
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Paid', 'Paid', 'client', 'Paid', NOW(), NOW());

-- Waiter Configuration
-- New: Can acknowledge, set in progress, or cancel
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'New', 'New', 'waiter', 'New', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'New', 'Acknowledged', 'waiter', 'Acknowledged', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'New', 'InProgress', 'waiter', 'In Progress', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'New', 'Cancelled', 'waiter', 'Cancel', NOW(), NOW());

-- Cancelled: No dropdown (view only)
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Cancelled', 'Cancelled', 'waiter', 'Cancelled', NOW(), NOW());

-- Acknowledged: Can set in progress or cancel
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Acknowledged', 'Acknowledged', 'waiter', 'Acknowledged', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Acknowledged', 'InProgress', 'waiter', 'In Progress', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Acknowledged', 'Cancelled', 'waiter', 'Cancel', NOW(), NOW());

-- InProgress: Can complete or cancel
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'InProgress', 'InProgress', 'waiter', 'In Progress', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'InProgress', 'Complete', 'waiter', 'Completed', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'InProgress', 'Cancelled', 'waiter', 'Cancel', NOW(), NOW());

-- Complete: Can deliver
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Complete', 'Complete', 'waiter', 'Completed', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Complete', 'Delivered', 'waiter', 'Delivered', NOW(), NOW());

-- Delivered: Can set as paid
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Delivered', 'Delivered', 'waiter', 'Delivered', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Delivered', 'Paid', 'waiter', 'Paid', NOW(), NOW());

-- Paid: No dropdown (view only)
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Paid', 'Paid', 'waiter', 'Paid', NOW(), NOW());

-- Admin Configuration (Full Control)
-- New: All transitions available
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'New', 'New', 'admin', 'New', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'New', 'Acknowledged', 'admin', 'Acknowledged', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'New', 'InProgress', 'admin', 'In Progress', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'New', 'Complete', 'admin', 'Completed', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'New', 'Delivered', 'admin', 'Delivered', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'New', 'Paid', 'admin', 'Paid', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'New', 'Cancelled', 'admin', 'Cancelled', NOW(), NOW());

-- Cancelled: All transitions available
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Cancelled', 'New', 'admin', 'New', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Cancelled', 'Acknowledged', 'admin', 'Acknowledged', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Cancelled', 'InProgress', 'admin', 'In Progress', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Cancelled', 'Complete', 'admin', 'Completed', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Cancelled', 'Delivered', 'admin', 'Delivered', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Cancelled', 'Paid', 'admin', 'Paid', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Cancelled', 'Cancelled', 'admin', 'Cancelled', NOW(), NOW());

-- Acknowledged: All transitions available  
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Acknowledged', 'New', 'admin', 'New', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Acknowledged', 'Acknowledged', 'admin', 'Acknowledged', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Acknowledged', 'InProgress', 'admin', 'In Progress', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Acknowledged', 'Complete', 'admin', 'Completed', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Acknowledged', 'Delivered', 'admin', 'Delivered', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Acknowledged', 'Paid', 'admin', 'Paid', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Acknowledged', 'Cancelled', 'admin', 'Cancelled', NOW(), NOW());

-- InProgress: All transitions available
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'InProgress', 'New', 'admin', 'New', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'InProgress', 'Acknowledged', 'admin', 'Acknowledged', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'InProgress', 'InProgress', 'admin', 'In Progress', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'InProgress', 'Complete', 'admin', 'Completed', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'InProgress', 'Delivered', 'admin', 'Delivered', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'InProgress', 'Paid', 'admin', 'Paid', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'InProgress', 'Cancelled', 'admin', 'Cancelled', NOW(), NOW());

-- Complete: All transitions available
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Complete', 'New', 'admin', 'New', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Complete', 'Acknowledged', 'admin', 'Acknowledged', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Complete', 'InProgress', 'admin', 'In Progress', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Complete', 'Complete', 'admin', 'Completed', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Complete', 'Delivered', 'admin', 'Delivered', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Complete', 'Paid', 'admin', 'Paid', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Complete', 'Cancelled', 'admin', 'Cancelled', NOW(), NOW());

-- Delivered: All transitions available
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Delivered', 'New', 'admin', 'New', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Delivered', 'Acknowledged', 'admin', 'Acknowledged', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Delivered', 'InProgress', 'admin', 'In Progress', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Delivered', 'Complete', 'admin', 'Completed', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Delivered', 'Delivered', 'admin', 'Delivered', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Delivered', 'Paid', 'admin', 'Paid', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Delivered', 'Cancelled', 'admin', 'Cancelled', NOW(), NOW());

-- Paid: All transitions available
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Paid', 'New', 'admin', 'New', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Paid', 'Acknowledged', 'admin', 'Acknowledged', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Paid', 'InProgress', 'admin', 'In Progress', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Paid', 'Complete', 'admin', 'Completed', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Paid', 'Delivered', 'admin', 'Delivered', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Paid', 'Paid', 'admin', 'Paid', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Paid', 'Cancelled', 'admin', 'Cancelled', NOW(), NOW());

-- Manager Configuration (Same as Admin)
-- New: All transitions available
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'New', 'New', 'manager', 'New', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'New', 'Acknowledged', 'manager', 'Acknowledged', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'New', 'InProgress', 'manager', 'In Progress', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'New', 'Complete', 'manager', 'Completed', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'New', 'Delivered', 'manager', 'Delivered', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'New', 'Paid', 'manager', 'Paid', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'New', 'Cancelled', 'manager', 'Cancelled', NOW(), NOW());

-- Cancelled: All transitions available
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Cancelled', 'New', 'manager', 'New', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Cancelled', 'Acknowledged', 'manager', 'Acknowledged', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Cancelled', 'InProgress', 'manager', 'In Progress', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Cancelled', 'Complete', 'manager', 'Completed', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Cancelled', 'Delivered', 'manager', 'Delivered', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Cancelled', 'Paid', 'manager', 'Paid', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Cancelled', 'Cancelled', 'manager', 'Cancelled', NOW(), NOW());

-- Acknowledged: All transitions available  
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Acknowledged', 'New', 'manager', 'New', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Acknowledged', 'Acknowledged', 'manager', 'Acknowledged', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Acknowledged', 'InProgress', 'manager', 'In Progress', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Acknowledged', 'Complete', 'manager', 'Completed', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Acknowledged', 'Delivered', 'manager', 'Delivered', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Acknowledged', 'Paid', 'manager', 'Paid', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Acknowledged', 'Cancelled', 'manager', 'Cancelled', NOW(), NOW());

-- InProgress: All transitions available
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'InProgress', 'New', 'manager', 'New', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'InProgress', 'Acknowledged', 'manager', 'Acknowledged', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'InProgress', 'InProgress', 'manager', 'In Progress', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'InProgress', 'Complete', 'manager', 'Completed', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'InProgress', 'Delivered', 'manager', 'Delivered', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'InProgress', 'Paid', 'manager', 'Paid', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'InProgress', 'Cancelled', 'manager', 'Cancelled', NOW(), NOW());

-- Complete: All transitions available
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Complete', 'New', 'manager', 'New', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Complete', 'Acknowledged', 'manager', 'Acknowledged', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Complete', 'InProgress', 'manager', 'In Progress', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Complete', 'Complete', 'manager', 'Completed', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Complete', 'Delivered', 'manager', 'Delivered', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Complete', 'Paid', 'manager', 'Paid', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Complete', 'Cancelled', 'manager', 'Cancelled', NOW(), NOW());

-- Delivered: All transitions available
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Delivered', 'New', 'manager', 'New', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Delivered', 'Acknowledged', 'manager', 'Acknowledged', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Delivered', 'InProgress', 'manager', 'In Progress', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Delivered', 'Complete', 'manager', 'Completed', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Delivered', 'Delivered', 'manager', 'Delivered', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Delivered', 'Paid', 'manager', 'Paid', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Delivered', 'Cancelled', 'manager', 'Cancelled', NOW(), NOW());

-- Paid: All transitions available
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Paid', 'New', 'manager', 'New', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Paid', 'Acknowledged', 'manager', 'Acknowledged', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Paid', 'InProgress', 'manager', 'In Progress', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Paid', 'Complete', 'manager', 'Completed', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Paid', 'Delivered', 'manager', 'Delivered', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Paid', 'Paid', 'manager', 'Paid', NOW(), NOW());
INSERT INTO "order_status_config" ("id", "currentStatus", "targetStatus", "userRole", "label", "created_at", "updated_at") VALUES (gen_random_uuid(), 'Paid', 'Cancelled', 'manager', 'Cancelled', NOW(), NOW());
