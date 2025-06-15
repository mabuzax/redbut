-- CreateTable
CREATE TABLE "requests_log" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "date_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requests_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "requests_log_request_id_idx" ON "requests_log"("request_id");

-- CreateIndex
CREATE INDEX "requests_log_date_time_idx" ON "requests_log"("date_time");

-- AddForeignKey
ALTER TABLE "requests_log" ADD CONSTRAINT "requests_log_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
