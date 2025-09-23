-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "prediction_result";

-- CreateTable
CREATE TABLE "prediction_result"."prediction_run" (
    "id" SERIAL NOT NULL,
    "sample_no" TEXT NOT NULL,
    "submission_no" TEXT,
    "description" TEXT,
    "predict_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "annotated_image_path" TEXT,
    "raw_image_path" TEXT,
    "model_version" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_msg" TEXT,
    "processing_time_ms" INTEGER,
    "confidence_threshold" DOUBLE PRECISION,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prediction_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_result"."row_counts" (
    "id" SERIAL NOT NULL,
    "run_id" INTEGER NOT NULL,
    "counts" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "row_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_result"."inference_results" (
    "id" SERIAL NOT NULL,
    "run_id" INTEGER NOT NULL,
    "results" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inference_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_result"."well_prediction" (
    "id" SERIAL NOT NULL,
    "run_id" INTEGER NOT NULL,
    "well_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "bbox" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "well_prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_result"."image_file" (
    "id" SERIAL NOT NULL,
    "run_id" INTEGER NOT NULL,
    "sample_no" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" BIGINT,
    "mime_type" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "bucket_name" TEXT,
    "object_key" TEXT,
    "signed_url" TEXT,
    "url_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_result"."system_config" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "prediction_run_sample_no_idx" ON "prediction_result"."prediction_run"("sample_no");

-- CreateIndex
CREATE INDEX "prediction_run_predict_at_idx" ON "prediction_result"."prediction_run"("predict_at");

-- CreateIndex
CREATE INDEX "prediction_run_status_idx" ON "prediction_result"."prediction_run"("status");

-- CreateIndex
CREATE INDEX "row_counts_run_id_idx" ON "prediction_result"."row_counts"("run_id");

-- CreateIndex
CREATE INDEX "inference_results_run_id_idx" ON "prediction_result"."inference_results"("run_id");

-- CreateIndex
CREATE INDEX "well_prediction_run_id_idx" ON "prediction_result"."well_prediction"("run_id");

-- CreateIndex
CREATE INDEX "well_prediction_well_id_idx" ON "prediction_result"."well_prediction"("well_id");

-- CreateIndex
CREATE INDEX "well_prediction_class_idx" ON "prediction_result"."well_prediction"("class");

-- CreateIndex
CREATE INDEX "image_file_run_id_idx" ON "prediction_result"."image_file"("run_id");

-- CreateIndex
CREATE INDEX "image_file_sample_no_idx" ON "prediction_result"."image_file"("sample_no");

-- CreateIndex
CREATE INDEX "image_file_file_type_idx" ON "prediction_result"."image_file"("file_type");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "prediction_result"."system_config"("key");

-- CreateIndex
CREATE INDEX "health_checks_service_idx" ON "public"."health_checks"("service");

-- CreateIndex
CREATE INDEX "health_checks_timestamp_idx" ON "public"."health_checks"("timestamp");

-- AddForeignKey
ALTER TABLE "prediction_result"."row_counts" ADD CONSTRAINT "row_counts_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "prediction_result"."prediction_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_result"."inference_results" ADD CONSTRAINT "inference_results_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "prediction_result"."prediction_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_result"."well_prediction" ADD CONSTRAINT "well_prediction_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "prediction_result"."prediction_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_result"."image_file" ADD CONSTRAINT "image_file_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "prediction_result"."prediction_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
