/*
  Warnings:

  - You are about to drop the `menu_category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `menu_item` table. If the table is not empty, all the data it contains will be lost.

*/

-- DropForeignKey
ALTER TABLE "menu_item" DROP CONSTRAINT IF EXISTS "menu_item_category_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "menu_category";

-- DropTable
DROP TABLE IF EXISTS "menu_item";

-- CreateTable
CREATE TABLE "menu_items" (
    "id" TEXT NOT NULL,
    "category" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "price" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "video" TEXT,
    "served_info" TEXT,
    "available_options" JSONB,
    "available_extras" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "menu_items_category_idx" ON "menu_items"("category");

-- CreateIndex
CREATE INDEX "menu_items_status_idx" ON "menu_items"("status");
