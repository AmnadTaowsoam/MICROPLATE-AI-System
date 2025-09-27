-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "prediction_result";

-- CreateTable
CREATE TABLE "prediction_result"."sample_summary" (
    "sample_no" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "total_runs" INTEGER NOT NULL DEFAULT 0,
    "last_run_at" TIMESTAMP(3),
    "last_run_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sample_summary_pkey" PRIMARY KEY ("sample_no")
);

-- CreateTable
CREATE TABLE "prediction_result"."interface_file" (
    "id" UUID NOT NULL,
    "sample_no" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "generated_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "error_msg" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interface_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."health_checks" (
    "id" UUID NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sample_summary_last_run_at_idx" ON "prediction_result"."sample_summary"("last_run_at");

-- CreateIndex
CREATE INDEX "interface_file_sample_no_idx" ON "prediction_result"."interface_file"("sample_no");

-- CreateIndex
CREATE INDEX "interface_file_status_idx" ON "prediction_result"."interface_file"("status");

-- CreateIndex
CREATE INDEX "health_checks_service_idx" ON "public"."health_checks"("service");

-- CreateIndex
CREATE INDEX "health_checks_timestamp_idx" ON "public"."health_checks"("timestamp");
