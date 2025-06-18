/*
  Warnings:

  - Added the required column `updated_at` to the `waiter` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "access_users" DROP CONSTRAINT "access_users_user_id_fkey";

-- DropForeignKey
ALTER TABLE "waiter_metrics" DROP CONSTRAINT "waiter_metrics_waiter_id_fkey";

-- DropForeignKey
ALTER TABLE "waiter_rating" DROP CONSTRAINT "waiter_rating_user_id_fkey";

-- DropForeignKey
ALTER TABLE "waiter_rating" DROP CONSTRAINT "waiter_rating_waiter_id_fkey";

-- AlterTable
ALTER TABLE "waiter" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_allocations" (
    "id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "table_numbers" INTEGER[],
    "waiter_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "table_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shifts_date_idx" ON "shifts"("date");

-- CreateIndex
CREATE INDEX "shifts_start_time_idx" ON "shifts"("start_time");

-- CreateIndex
CREATE INDEX "table_allocations_shift_id_idx" ON "table_allocations"("shift_id");

-- CreateIndex
CREATE INDEX "table_allocations_waiter_id_idx" ON "table_allocations"("waiter_id");

-- CreateIndex
CREATE INDEX "table_allocations_shift_id_waiter_id_idx" ON "table_allocations"("shift_id", "waiter_id");

-- AddForeignKey
ALTER TABLE "table_allocations" ADD CONSTRAINT "table_allocations_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_allocations" ADD CONSTRAINT "table_allocations_waiter_id_fkey" FOREIGN KEY ("waiter_id") REFERENCES "waiter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_users" ADD CONSTRAINT "access_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "waiter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiter_metrics" ADD CONSTRAINT "waiter_metrics_waiter_id_fkey" FOREIGN KEY ("waiter_id") REFERENCES "waiter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiter_rating" ADD CONSTRAINT "waiter_rating_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiter_rating" ADD CONSTRAINT "waiter_rating_waiter_id_fkey" FOREIGN KEY ("waiter_id") REFERENCES "waiter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
