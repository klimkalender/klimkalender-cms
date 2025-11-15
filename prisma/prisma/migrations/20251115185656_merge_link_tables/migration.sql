/*
  Warnings:

  - You are about to drop the `wasm_event_links` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[event_id]` on the table `wasm_events` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `accepted_classification` to the `wasm_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accepted_event_category` to the `wasm_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `action` to the `wasm_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `wasm_events` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."wasm_event_links" DROP CONSTRAINT "wasm_event_links_event_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."wasm_event_links" DROP CONSTRAINT "wasm_event_links_wasm_event_id_fkey";

-- AlterTable
ALTER TABLE "wasm_events" ADD COLUMN     "accepted_classification" "wasm_event_classification" NOT NULL,
ADD COLUMN     "accepted_date" TIMESTAMPTZ(3),
ADD COLUMN     "accepted_event_category" "wasm_event_category" NOT NULL,
ADD COLUMN     "accepted_event_url" TEXT,
ADD COLUMN     "accepted_full_description_html" TEXT,
ADD COLUMN     "accepted_hall_name" TEXT,
ADD COLUMN     "accepted_image_url" TEXT,
ADD COLUMN     "accepted_name" TEXT,
ADD COLUMN     "accepted_short_description" TEXT,
ADD COLUMN     "action" "wasm_action" NOT NULL,
ADD COLUMN     "event_id" TEXT,
ADD COLUMN     "processed_at" TIMESTAMPTZ(3),
ADD COLUMN     "status" "wasm_event_status" NOT NULL;

-- DropTable
DROP TABLE "public"."wasm_event_links";

-- CreateIndex
CREATE UNIQUE INDEX "wasm_events_event_id_key" ON "wasm_events"("event_id");

-- AddForeignKey
ALTER TABLE "wasm_events" ADD CONSTRAINT "wasm_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("external_id") ON DELETE SET NULL ON UPDATE CASCADE;
