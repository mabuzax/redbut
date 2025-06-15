/*
  Warnings:

  - You are about to alter the column `item_price` on the `menu_item` table. The data in that column could be lost. The data in that column will be cast from `Real` to `Decimal(65,30)`.
  - You are about to drop the column `price` on the `orders` table. All the data in the column will be lost.
  - The `status` column on the `requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `role` on the `chat_messages` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `item_price` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('user', 'assistant', 'system');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('New', 'Acknowledged', 'InProgress', 'Completed', 'OnHold', 'Cancelled', 'Done');

-- CreateEnum
CREATE TYPE "SortOrder" AS ENUM ('asc', 'desc');

-- DropForeignKey
ALTER TABLE "waiter_metrics" DROP CONSTRAINT "waiter_metrics_waiter_id_fkey";

-- DropForeignKey
ALTER TABLE "waiter_rating" DROP CONSTRAINT "waiter_rating_waiter_id_fkey";

-- AlterTable
ALTER TABLE "chat_messages" DROP COLUMN "role",
ADD COLUMN     "role" "ChatRole" NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "menu_item" ALTER COLUMN "item_price" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "price",
ADD COLUMN     "item_price" DECIMAL(65,30) NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "requests" DROP COLUMN "status",
ADD COLUMN     "status" "RequestStatus" NOT NULL DEFAULT 'New',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "reviews" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "waiter" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "waiter_metrics" ALTER COLUMN "metric_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "avg_response_time" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "rating_avg" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "waiter_rating" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "requests_table_number_status_idx" ON "requests"("table_number", "status");

-- AddForeignKey
ALTER TABLE "waiter_metrics" ADD CONSTRAINT "waiter_metrics_waiter_id_fkey" FOREIGN KEY ("waiter_id") REFERENCES "waiter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiter_rating" ADD CONSTRAINT "waiter_rating_waiter_id_fkey" FOREIGN KEY ("waiter_id") REFERENCES "waiter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
