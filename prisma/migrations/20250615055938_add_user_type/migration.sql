-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('admin', 'waiter', 'manager');

-- AlterTable
ALTER TABLE "access_users" ADD COLUMN     "userType" "UserType" NOT NULL DEFAULT 'waiter';
