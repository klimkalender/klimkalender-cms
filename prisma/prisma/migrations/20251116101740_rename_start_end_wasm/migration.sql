/*
  Warnings:

  - You are about to drop the column `record_end_at` on the `wasm_events` table. All the data in the column will be lost.
  - You are about to drop the column `record_start_at` on the `wasm_events` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "wasm_events" DROP COLUMN "record_end_at",
DROP COLUMN "record_start_at",
ADD COLUMN     "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ(3);
