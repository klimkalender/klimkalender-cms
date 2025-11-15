-- DropForeignKey
ALTER TABLE "public"."wasm_event_links" DROP CONSTRAINT "wasm_event_links_event_id_fkey";

-- AlterTable
ALTER TABLE "wasm_event_links" ALTER COLUMN "event_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "wasm_event_links" ADD CONSTRAINT "wasm_event_links_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("external_id") ON DELETE SET NULL ON UPDATE CASCADE;
