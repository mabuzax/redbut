-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('New', 'Acknowledged', 'InProgress', 'Delivered', 'Paid');

-- AlterTable orders: Add new columns status, updated_at, user_id
ALTER TABLE "orders"
ADD COLUMN "status" "OrderStatus" NOT NULL DEFAULT 'New',
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Default for existing rows, Prisma @updatedAt will handle future updates
ADD COLUMN "user_id" TEXT;

-- AlterTable orders: Drop old columns item, item_price
-- WARNING: This will delete data from these columns. Ensure data migration if needed.
ALTER TABLE "orders"
DROP COLUMN "item",
DROP COLUMN "item_price";

-- CreateTable order_items
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(10,2) NOT NULL, -- Assuming 10 total digits, 2 decimal places, adjust as needed
    "status" "OrderStatus" NOT NULL DEFAULT 'New',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for new columns on "orders"
CREATE INDEX "orders_status_idx" ON "orders"("status");
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

-- CreateIndex for "order_items"
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");
CREATE INDEX "order_items_menu_item_id_idx" ON "order_items"("menu_item_id");

-- AddForeignKey for user_id on "orders"
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey for order_id on "order_items"
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey for menu_item_id on "order_items"
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Manually set updatedAt for existing orders to createdAt as a one-time operation
-- because the DEFAULT CURRENT_TIMESTAMP only applies to new rows after this migration.
-- Prisma's @updatedAt will handle future updates at the application level.
UPDATE "orders" SET "updated_at" = "created_at";
