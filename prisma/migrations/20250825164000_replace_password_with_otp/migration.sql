-- AlterTable
ALTER TABLE "access_users" DROP COLUMN "password";
ALTER TABLE "access_users" ADD COLUMN "code" TEXT;
