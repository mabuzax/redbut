-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL enums are not modifiable after creation,
-- so this uses a workaround to make it work.

-- execute immediate
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'Cancelled';

-- execute immediate
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'Complete';
