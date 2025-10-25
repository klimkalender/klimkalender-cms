
ALTER TABLE "venues" ADD COLUMN "address" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "country" TEXT,
ADD COLUMN "postal_code" TEXT;

UPDATE "venues" 
SET 
  "address" = TRIM(SPLIT_PART("full_address", ',', 1)),
  "postal_code" = TRIM(SPLIT_PART("full_address", ',', 2)),
  "city" = TRIM(SPLIT_PART("full_address", ',', 3)),
  "country" = TRIM(SPLIT_PART("full_address", ',', 4))
WHERE "full_address" IS NOT NULL;

ALTER TABLE "venues" DROP COLUMN "full_address";

