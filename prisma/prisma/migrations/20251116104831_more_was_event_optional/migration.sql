-- AlterTable
ALTER TABLE "wasm_events" ALTER COLUMN "action" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'NEW';
