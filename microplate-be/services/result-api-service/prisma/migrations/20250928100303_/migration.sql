/*
  Warnings:

  - You are about to drop the `image_file` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `interface_file` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "prediction_result"."image_file" DROP CONSTRAINT "image_file_run_id_fkey";

-- DropTable
DROP TABLE "prediction_result"."image_file";

-- DropTable
DROP TABLE "prediction_result"."interface_file";
