-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "waiter_metrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "waiter_id" TEXT NOT NULL,
    "metric_date" TIMESTAMP NOT NULL,
    "open_handled" INTEGER NOT NULL,
    "avg_response_time" REAL NOT NULL,
    "rating_avg" REAL NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "waiter_metrics_waiter_id_fkey" FOREIGN KEY ("waiter_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "waiter_rating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "waiter_id" TEXT NOT NULL,
    "friendliness" INTEGER NOT NULL,
    "orderAccuracy" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL,
    "attentiveness" INTEGER NOT NULL,
    "knowledge" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "waiter_rating_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "waiter_rating_waiter_id_fkey" FOREIGN KEY ("waiter_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "reviews_user_id_idx" ON "reviews"("user_id");

-- CreateIndex
CREATE INDEX "waiter_metrics_waiter_id_idx" ON "waiter_metrics"("waiter_id");

-- CreateIndex
CREATE INDEX "waiter_rating_user_id_idx" ON "waiter_rating"("user_id");

-- CreateIndex
CREATE INDEX "waiter_rating_waiter_id_idx" ON "waiter_rating"("waiter_id");
