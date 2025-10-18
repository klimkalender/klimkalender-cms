/*
  Warnings:

  - You are about to drop the column `eventId` on the `event_tags` table. All the data in the column will be lost.
  - You are about to drop the column `tagId` on the `event_tags` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[event_id,tag_id]` on the table `event_tags` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `event_id` to the `event_tags` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tag_id` to the `event_tags` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."event_tags" DROP CONSTRAINT "event_tags_eventId_fkey";

-- DropForeignKey
ALTER TABLE "public"."event_tags" DROP CONSTRAINT "event_tags_tagId_fkey";

-- DropIndex
DROP INDEX "public"."event_tags_eventId_tagId_key";

-- AlterTable
ALTER TABLE "event_tags" DROP COLUMN "eventId",
DROP COLUMN "tagId",
ADD COLUMN     "event_id" INTEGER NOT NULL,
ADD COLUMN     "tag_id" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "event_tags_event_id_tag_id_key" ON "event_tags"("event_id", "tag_id");

-- AddForeignKey
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
