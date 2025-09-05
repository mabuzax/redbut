-- Update Order Status Configuration to match the spreadsheet exactly
-- Clear existing configuration
DELETE FROM "order_status_config";

-- CLIENT ROLE CONFIGURATION
-- New: Can view status or Cancel
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'New', 'client', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Cancelled', 'client', 'Cancel');

-- Acknowledged: Can view status or Cancel
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Acknowledged', 'client', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Cancelled', 'client', 'Cancel');

-- InProgress: Can only view status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'InProgress', 'client', 'In Progress');

-- Complete: Can only view status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Complete', 'client', 'Completed');

-- Delivered: Can view status or Reject
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Delivered', 'client', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Rejected', 'client', 'Reject');

-- Paid: Can only view status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Paid', 'client', 'Paid');

-- Cancelled: Can only view status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Cancelled', 'client', 'Cancelled');

-- Rejected: Can only view status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Rejected', 'Rejected', 'client', 'Rejected');

-- WAITER ROLE CONFIGURATION
-- New: Can acknowledge, set in progress, or cancel
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'New', 'waiter', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Acknowledged', 'waiter', 'Acknowledge');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'InProgress', 'waiter', 'Start Preparing');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Cancelled', 'waiter', 'Cancel');

-- Acknowledged: Can set in progress or cancel
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Acknowledged', 'waiter', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'InProgress', 'waiter', 'Start Preparing');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Cancelled', 'waiter', 'Cancel');

-- InProgress: Can complete or cancel
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'InProgress', 'waiter', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Complete', 'waiter', 'Mark Complete');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Cancelled', 'waiter', 'Cancel');

-- Complete: Can deliver
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Complete', 'waiter', 'Completed');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Delivered', 'waiter', 'Deliver');

-- Delivered: Can mark as paid
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Delivered', 'waiter', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Paid', 'waiter', 'Mark Paid');

-- Paid: Can only view status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Paid', 'waiter', 'Paid');

-- Cancelled: Can only view status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Cancelled', 'waiter', 'Cancelled');

-- Rejected: Can only view status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Rejected', 'Rejected', 'waiter', 'Rejected');

-- ADMIN ROLE CONFIGURATION (Full Control)
-- New: All transitions available
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'New', 'admin', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Acknowledged', 'admin', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'InProgress', 'admin', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Complete', 'admin', 'Completed');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Delivered', 'admin', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Paid', 'admin', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Cancelled', 'admin', 'Cancelled');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Rejected', 'admin', 'Rejected');

-- Acknowledged: All transitions available
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'New', 'admin', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Acknowledged', 'admin', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'InProgress', 'admin', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Complete', 'admin', 'Completed');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Delivered', 'admin', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Paid', 'admin', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Cancelled', 'admin', 'Cancelled');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Rejected', 'admin', 'Rejected');

-- InProgress: All transitions available
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'New', 'admin', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Acknowledged', 'admin', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'InProgress', 'admin', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Complete', 'admin', 'Completed');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Delivered', 'admin', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Paid', 'admin', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Cancelled', 'admin', 'Cancelled');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Rejected', 'admin', 'Rejected');

-- Complete: All transitions available
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'New', 'admin', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Acknowledged', 'admin', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'InProgress', 'admin', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Complete', 'admin', 'Completed');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Delivered', 'admin', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Paid', 'admin', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Cancelled', 'admin', 'Cancelled');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Rejected', 'admin', 'Rejected');

-- Delivered: All transitions available
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'New', 'admin', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Acknowledged', 'admin', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'InProgress', 'admin', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Complete', 'admin', 'Completed');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Delivered', 'admin', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Paid', 'admin', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Cancelled', 'admin', 'Cancelled');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Rejected', 'admin', 'Rejected');

-- Paid: All transitions available
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'New', 'admin', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Acknowledged', 'admin', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'InProgress', 'admin', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Complete', 'admin', 'Completed');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Delivered', 'admin', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Paid', 'admin', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Cancelled', 'admin', 'Cancelled');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Rejected', 'admin', 'Rejected');

-- Cancelled: All transitions available
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'New', 'admin', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Acknowledged', 'admin', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'InProgress', 'admin', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Complete', 'admin', 'Completed');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Delivered', 'admin', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Paid', 'admin', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Cancelled', 'admin', 'Cancelled');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Rejected', 'admin', 'Rejected');

-- Rejected: All transitions available
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Rejected', 'New', 'admin', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Rejected', 'Acknowledged', 'admin', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Rejected', 'InProgress', 'admin', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Rejected', 'Complete', 'admin', 'Completed');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Rejected', 'Delivered', 'admin', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Rejected', 'Paid', 'admin', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Rejected', 'Cancelled', 'admin', 'Cancelled');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Rejected', 'Rejected', 'admin', 'Rejected');

-- MANAGER ROLE CONFIGURATION (Same as Admin - Full Control)
-- New: All transitions available
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'New', 'manager', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Acknowledged', 'manager', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'InProgress', 'manager', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Complete', 'manager', 'Completed');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Delivered', 'manager', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Paid', 'manager', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Cancelled', 'manager', 'Cancelled');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Rejected', 'manager', 'Rejected');

-- Acknowledged: All transitions available
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'New', 'manager', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Acknowledged', 'manager', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'InProgress', 'manager', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Complete', 'manager', 'Completed');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Delivered', 'manager', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Paid', 'manager', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Cancelled', 'manager', 'Cancelled');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Rejected', 'manager', 'Rejected');

-- InProgress: All transitions available
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'New', 'manager', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Acknowledged', 'manager', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'InProgress', 'manager', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Complete', 'manager', 'Completed');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Delivered', 'manager', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Paid', 'manager', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Cancelled', 'manager', 'Cancelled');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Rejected', 'manager', 'Rejected');

-- Complete: All transitions available
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'New', 'manager', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Acknowledged', 'manager', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'InProgress', 'manager', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Complete', 'manager', 'Completed');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Delivered', 'manager', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Paid', 'manager', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Cancelled', 'manager', 'Cancelled');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Rejected', 'manager', 'Rejected');

-- Delivered: All transitions available
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'New', 'manager', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Acknowledged', 'manager', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'InProgress', 'manager', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Complete', 'manager', 'Completed');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Delivered', 'manager', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Paid', 'manager', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Cancelled', 'manager', 'Cancelled');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Rejected', 'manager', 'Rejected');

-- Paid: All transitions available
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'New', 'manager', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Acknowledged', 'manager', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'InProgress', 'manager', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Complete', 'manager', 'Completed');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Delivered', 'manager', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Paid', 'manager', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Cancelled', 'manager', 'Cancelled');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Rejected', 'manager', 'Rejected');

-- Cancelled: All transitions available
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'New', 'manager', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Acknowledged', 'manager', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'InProgress', 'manager', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Complete', 'manager', 'Completed');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Delivered', 'manager', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Paid', 'manager', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Cancelled', 'manager', 'Cancelled');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Rejected', 'manager', 'Rejected');

-- Rejected: All transitions available
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Rejected', 'New', 'manager', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Rejected', 'Acknowledged', 'manager', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Rejected', 'InProgress', 'manager', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Rejected', 'Complete', 'manager', 'Completed');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Rejected', 'Delivered', 'manager', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Rejected', 'Paid', 'manager', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Rejected', 'Cancelled', 'manager', 'Cancelled');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Rejected', 'Rejected', 'manager', 'Rejected');
