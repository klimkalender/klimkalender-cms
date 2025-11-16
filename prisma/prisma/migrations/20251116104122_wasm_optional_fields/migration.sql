-- AlterTable
ALTER TABLE "wasm_events" ALTER COLUMN "accepted_classification" DROP NOT NULL,
ALTER COLUMN "accepted_event_category" DROP NOT NULL;
