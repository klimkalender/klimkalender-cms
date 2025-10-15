-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "description" TEXT,
ADD COLUMN     "status" "EventStatus" NOT NULL DEFAULT 'DRAFT';
