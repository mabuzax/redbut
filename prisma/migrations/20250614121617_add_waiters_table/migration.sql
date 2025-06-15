-- CreateTable
CREATE TABLE "waiter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "tag_nickname" TEXT NOT NULL,
    "propic" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "waiter_phone_key" ON "waiter"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "waiter_email_key" ON "waiter"("email");
