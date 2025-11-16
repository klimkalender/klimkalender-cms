/*
  Warnings:

  - The `event_id` column on the `wasm_events` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropForeignKey
ALTER TABLE "public"."wasm_events" DROP CONSTRAINT "wasm_events_event_id_fkey";

-- AlterTable
ALTER TABLE "wasm_events" DROP COLUMN "event_id",
ADD COLUMN     "event_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "wasm_events_event_id_key" ON "wasm_events"("event_id");

-- AddForeignKey
ALTER TABLE "wasm_events" ADD CONSTRAINT "wasm_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
