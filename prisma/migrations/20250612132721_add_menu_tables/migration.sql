-- CreateTable
CREATE TABLE "menu_category" (
    "category_id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "menu_item" (
    "item_id" TEXT NOT NULL PRIMARY KEY,
    "item_name" TEXT NOT NULL,
    "item_description" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "item_price" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    CONSTRAINT "menu_item_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "menu_category" ("category_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "menu_item_category_id_idx" ON "menu_item"("category_id");
