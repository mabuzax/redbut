-- CreateTable
CREATE TABLE "request_status_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "currentStatus" "RequestStatus" NOT NULL,
    "targetStatus" "RequestStatus" NOT NULL,
    "userRole" VARCHAR(255) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_status_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "request_status_config_currentStatus_idx" ON "request_status_config"("currentStatus");

-- CreateIndex
CREATE INDEX "request_status_config_userRole_idx" ON "request_status_config"("userRole");

-- CreateIndex
CREATE INDEX "request_status_config_currentStatus_userRole_idx" ON "request_status_config"("currentStatus", "userRole");

-- Insert Client/web role transitions
-- New status
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'New', 'client', 'New');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'OnHold', 'client', 'Hold');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Cancelled', 'client', 'Cancel');

-- OnHold status
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('OnHold', 'OnHold', 'client', 'OnHold');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('OnHold', 'Cancelled', 'client', 'Cancel');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('OnHold', 'New', 'client', 'Activate');

-- Cancelled status (no transitions)

-- Acknowledged status
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Acknowledged', 'client', 'Acknowledged');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'OnHold', 'client', 'Hold');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Cancelled', 'client', 'Cancel');

-- InProgress status (no transitions)

-- Completed status
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Completed', 'New', 'client', 'Activate');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Completed', 'Done', 'client', 'Done');

-- Done status (no transitions)

-- Insert Waiter role transitions
-- New status
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'New', 'waiter', 'New');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Acknowledged', 'waiter', 'Acknowledge');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'InProgress', 'waiter', 'In Progress');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Completed', 'waiter', 'Completed');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Cancelled', 'waiter', 'Cancel');

-- OnHold status
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('OnHold', 'OnHold', 'waiter', 'OnHold');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('OnHold', 'New', 'waiter', 'Activate');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('OnHold', 'Cancelled', 'waiter', 'Cancel');

-- Cancelled status (no transitions)

-- Acknowledged status
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Acknowledged', 'waiter', 'Acknowledged');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'InProgress', 'waiter', 'In Progress');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Cancelled', 'waiter', 'Cancel');

-- InProgress status
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'InProgress', 'waiter', 'In Progress');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Completed', 'waiter', 'Completed');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Cancelled', 'waiter', 'Cancel');

-- Completed status (no transitions)
-- Done status (no transitions)

-- Insert Admin/Manager role transitions
-- All statuses to all possible transitions
-- New status
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'New', 'admin', 'New');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'OnHold', 'admin', 'Hold');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Cancelled', 'admin', 'Cancel');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Acknowledged', 'admin', 'Acknowledged');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'InProgress', 'admin', 'In Progress');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Completed', 'admin', 'Completed');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Done', 'admin', 'Done');

-- OnHold status
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('OnHold', 'New', 'admin', 'New');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('OnHold', 'OnHold', 'admin', 'Hold');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('OnHold', 'Cancelled', 'admin', 'Cancel');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('OnHold', 'Acknowledged', 'admin', 'Acknowledged');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('OnHold', 'InProgress', 'admin', 'In Progress');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('OnHold', 'Completed', 'admin', 'Completed');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('OnHold', 'Done', 'admin', 'Done');

-- Cancelled status
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'New', 'admin', 'New');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'OnHold', 'admin', 'Hold');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Cancelled', 'admin', 'Cancel');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Acknowledged', 'admin', 'Acknowledged');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'InProgress', 'admin', 'In Progress');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Completed', 'admin', 'Completed');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Done', 'admin', 'Done');

-- Acknowledged status
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'New', 'admin', 'New');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'OnHold', 'admin', 'Hold');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Cancelled', 'admin', 'Cancel');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Acknowledged', 'admin', 'Acknowledged');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'InProgress', 'admin', 'In Progress');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Completed', 'admin', 'Completed');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Done', 'admin', 'Done');

-- InProgress status
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'New', 'admin', 'New');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'OnHold', 'admin', 'Hold');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Cancelled', 'admin', 'Cancel');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Acknowledged', 'admin', 'Acknowledged');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'InProgress', 'admin', 'In Progress');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Completed', 'admin', 'Completed');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Done', 'admin', 'Done');

-- Completed status
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Completed', 'New', 'admin', 'New');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Completed', 'OnHold', 'admin', 'Hold');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Completed', 'Cancelled', 'admin', 'Cancel');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Completed', 'Acknowledged', 'admin', 'Acknowledged');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Completed', 'InProgress', 'admin', 'In Progress');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Completed', 'Completed', 'admin', 'Completed');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Completed', 'Done', 'admin', 'Done');

-- Done status
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Done', 'New', 'admin', 'New');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Done', 'OnHold', 'admin', 'Hold');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Done', 'Cancelled', 'admin', 'Cancel');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Done', 'Acknowledged', 'admin', 'Acknowledged');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Done', 'InProgress', 'admin', 'In Progress');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Done', 'Completed', 'admin', 'Completed');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Done', 'Done', 'admin', 'Done');

-- Add manager role with same permissions as admin
-- New status
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'New', 'manager', 'New');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'OnHold', 'manager', 'Hold');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Cancelled', 'manager', 'Cancel');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Acknowledged', 'manager', 'Acknowledged');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'InProgress', 'manager', 'In Progress');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Completed', 'manager', 'Completed');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('New', 'Done', 'manager', 'Done');

-- OnHold status
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('OnHold', 'New', 'manager', 'New');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('OnHold', 'OnHold', 'manager', 'Hold');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('OnHold', 'Cancelled', 'manager', 'Cancel');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('OnHold', 'Acknowledged', 'manager', 'Acknowledged');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('OnHold', 'InProgress', 'manager', 'In Progress');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('OnHold', 'Completed', 'manager', 'Completed');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('OnHold', 'Done', 'manager', 'Done');

-- Cancelled status
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'New', 'manager', 'New');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'OnHold', 'manager', 'Hold');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Cancelled', 'manager', 'Cancel');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Acknowledged', 'manager', 'Acknowledged');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'InProgress', 'manager', 'In Progress');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Completed', 'manager', 'Completed');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Cancelled', 'Done', 'manager', 'Done');

-- Acknowledged status
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'New', 'manager', 'New');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'OnHold', 'manager', 'Hold');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Cancelled', 'manager', 'Cancel');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Acknowledged', 'manager', 'Acknowledged');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'InProgress', 'manager', 'In Progress');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Completed', 'manager', 'Completed');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Acknowledged', 'Done', 'manager', 'Done');

-- InProgress status
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'New', 'manager', 'New');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'OnHold', 'manager', 'Hold');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Cancelled', 'manager', 'Cancel');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Acknowledged', 'manager', 'Acknowledged');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'InProgress', 'manager', 'In Progress');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Completed', 'manager', 'Completed');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('InProgress', 'Done', 'manager', 'Done');

-- Completed status
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Completed', 'New', 'manager', 'New');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Completed', 'OnHold', 'manager', 'Hold');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Completed', 'Cancelled', 'manager', 'Cancel');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Completed', 'Acknowledged', 'manager', 'Acknowledged');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Completed', 'InProgress', 'manager', 'In Progress');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Completed', 'Completed', 'manager', 'Completed');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Completed', 'Done', 'manager', 'Done');

-- Done status
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Done', 'New', 'manager', 'New');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Done', 'OnHold', 'manager', 'Hold');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Done', 'Cancelled', 'manager', 'Cancel');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Done', 'Acknowledged', 'manager', 'Acknowledged');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Done', 'InProgress', 'manager', 'In Progress');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Done', 'Completed', 'manager', 'Completed');
INSERT INTO "request_status_config" ("currentStatus", "targetStatus", "userRole", "label") VALUES ('Done', 'Done', 'manager', 'Done');
