-- CreateTable
CREATE TABLE "order_status_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "currentStatus" "OrderStatus" NOT NULL,
    "targetStatus" "OrderStatus" NOT NULL,
    "userRole" VARCHAR(255) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_status_config_currentStatus_idx" ON "order_status_config"("currentStatus");

-- CreateIndex
CREATE INDEX "order_status_config_userRole_idx" ON "order_status_config"("userRole");

-- CreateIndex
CREATE INDEX "order_status_config_currentStatus_userRole_idx" ON "order_status_config"("currentStatus", "userRole");

-- Insert Client/web role transitions
-- New status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'New', 'client', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Cancelled', 'client', 'Cancel');

-- Cancelled status (no transitions)
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Cancelled', 'client', 'Cancelled');

-- Acknowledged status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Acknowledged', 'client', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Cancelled', 'client', 'Cancel');

-- InProgress status (no transitions)
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'InProgress', 'client', 'In Progress');

-- Complete status (no transitions)
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Complete', 'client', 'Complete');

-- Delivered status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Delivered', 'client', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Cancelled', 'client', 'Cancel');

-- Paid status (no transitions)
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Paid', 'client', 'Paid');

-- Insert Waiter role transitions
-- New status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'New', 'waiter', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Acknowledged', 'waiter', 'Acknowledge');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'InProgress', 'waiter', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Cancelled', 'waiter', 'Cancel');

-- Cancelled status (no transitions)
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Cancelled', 'waiter', 'Cancelled');

-- Acknowledged status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Acknowledged', 'waiter', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'InProgress', 'waiter', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Cancelled', 'waiter', 'Cancel');

-- InProgress status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'InProgress', 'waiter', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Complete', 'waiter', 'Complete');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Cancelled', 'waiter', 'Cancel');

-- Complete status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Complete', 'waiter', 'Complete');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'InProgress', 'waiter', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Delivered', 'waiter', 'Delivered');

-- Delivered status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Delivered', 'waiter', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'InProgress', 'waiter', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Paid', 'waiter', 'Paid');

-- Paid status (no transitions)
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Paid', 'waiter', 'Paid');

-- Insert Admin role transitions
-- All statuses to all possible transitions
-- New status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'New', 'admin', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Acknowledged', 'admin', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'InProgress', 'admin', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Complete', 'admin', 'Complete');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Delivered', 'admin', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Paid', 'admin', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Cancelled', 'admin', 'Cancel');

-- Acknowledged status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'New', 'admin', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Acknowledged', 'admin', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'InProgress', 'admin', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Complete', 'admin', 'Complete');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Delivered', 'admin', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Paid', 'admin', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Cancelled', 'admin', 'Cancel');

-- InProgress status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'New', 'admin', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Acknowledged', 'admin', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'InProgress', 'admin', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Complete', 'admin', 'Complete');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Delivered', 'admin', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Paid', 'admin', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Cancelled', 'admin', 'Cancel');

-- Complete status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'New', 'admin', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Acknowledged', 'admin', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'InProgress', 'admin', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Complete', 'admin', 'Complete');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Delivered', 'admin', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Paid', 'admin', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Cancelled', 'admin', 'Cancel');

-- Delivered status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'New', 'admin', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Acknowledged', 'admin', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'InProgress', 'admin', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Complete', 'admin', 'Complete');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Delivered', 'admin', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Paid', 'admin', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Cancelled', 'admin', 'Cancel');

-- Paid status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'New', 'admin', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Acknowledged', 'admin', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'InProgress', 'admin', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Complete', 'admin', 'Complete');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Delivered', 'admin', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Paid', 'admin', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Cancelled', 'admin', 'Cancel');

-- Cancelled status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'New', 'admin', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Acknowledged', 'admin', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'InProgress', 'admin', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Complete', 'admin', 'Complete');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Delivered', 'admin', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Paid', 'admin', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Cancelled', 'admin', 'Cancel');

-- Add manager role with same permissions as admin
-- New status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'New', 'manager', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Acknowledged', 'manager', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'InProgress', 'manager', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Complete', 'manager', 'Complete');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Delivered', 'manager', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Paid', 'manager', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Cancelled', 'manager', 'Cancel');

-- Acknowledged status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'New', 'manager', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Acknowledged', 'manager', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'InProgress', 'manager', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Complete', 'manager', 'Complete');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Delivered', 'manager', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Paid', 'manager', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Cancelled', 'manager', 'Cancel');

-- InProgress status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'New', 'manager', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Acknowledged', 'manager', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'InProgress', 'manager', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Complete', 'manager', 'Complete');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Delivered', 'manager', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Paid', 'manager', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Cancelled', 'manager', 'Cancel');

-- Complete status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'New', 'manager', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Acknowledged', 'manager', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'InProgress', 'manager', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Complete', 'manager', 'Complete');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Delivered', 'manager', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Paid', 'manager', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Complete', 'Cancelled', 'manager', 'Cancel');

-- Delivered status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'New', 'manager', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Acknowledged', 'manager', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'InProgress', 'manager', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Complete', 'manager', 'Complete');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Delivered', 'manager', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Paid', 'manager', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Delivered', 'Cancelled', 'manager', 'Cancel');

-- Paid status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'New', 'manager', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Acknowledged', 'manager', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'InProgress', 'manager', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Complete', 'manager', 'Complete');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Delivered', 'manager', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Paid', 'manager', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Paid', 'Cancelled', 'manager', 'Cancel');

-- Cancelled status
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'New', 'manager', 'New');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Acknowledged', 'manager', 'Acknowledged');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'InProgress', 'manager', 'In Progress');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Complete', 'manager', 'Complete');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Delivered', 'manager', 'Delivered');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Paid', 'manager', 'Paid');
INSERT INTO "order_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Cancelled', 'manager', 'Cancel');
