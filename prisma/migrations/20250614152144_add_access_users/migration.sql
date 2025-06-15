-- CreateTable
CREATE TABLE "access_users" (
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "access_users_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "access_users_username_key" ON "access_users"("username");

-- AddForeignKey
ALTER TABLE "access_users" ADD CONSTRAINT "access_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "waiter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
