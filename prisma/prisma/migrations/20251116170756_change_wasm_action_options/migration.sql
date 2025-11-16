/*
  Warnings:

  - The values [IGNORE] on the enum `wasm_action` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "wasm_action_new" AS ENUM ('MANUAL_IMPORT', 'AUTO_IMPORT');
ALTER TABLE "wasm_events" ALTER COLUMN "action" TYPE "wasm_action_new" USING ("action"::text::"wasm_action_new");
ALTER TYPE "wasm_action" RENAME TO "wasm_action_old";
ALTER TYPE "wasm_action_new" RENAME TO "wasm_action";
DROP TYPE "public"."wasm_action_old";
COMMIT;
