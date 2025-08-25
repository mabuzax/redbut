-- Add the missing updated_at column to the waiter table with a default value
-- This fixes the null constraint violation when using @updatedAt in the Prisma schema
ALTER TABLE "waiter" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
