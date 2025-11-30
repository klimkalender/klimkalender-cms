/*
  Warnings:

  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `profiles` table. If the table is not empty, all the data it contains will be lost.

*/
-- -- DropForeignKey
-- ALTER TABLE "public"."profiles" DROP CONSTRAINT "profiles_id_fkey";

-- AlterTable
ALTER TABLE "public"."tags" ADD COLUMN     "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ(3);

-- -- DropTable
-- DROP TABLE "auth"."users";

-- -- DropTable
-- DROP TABLE "public"."profiles";
