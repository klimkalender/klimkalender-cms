/*
  Warnings:

  - Added the required column `updated_at` to the `organizers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `venues` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "organizers" ADD COLUMN     "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ(3) NOT NULL;

-- AlterTable
ALTER TABLE "venues" ADD COLUMN     "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ(3) NOT NULL;


CREATE OR REPLACE FUNCTION updated_at_trigger() RETURNS trigger
   LANGUAGE plpgsql
SET search_path = public, pg_temp
AS 
$$BEGIN
   NEW.updated_at := current_timestamp;
   RETURN NEW;
END;$$;

DO $$
DECLARE
    t record;
BEGIN
    FOR t IN
        SELECT * FROM information_schema.columns, INFORMATION_SCHEMA.tables
            WHERE
            information_schema.tables.table_catalog = information_schema.columns.table_catalog AND
            information_schema.tables.table_schema = information_schema.columns.table_schema AND
            information_schema.tables.table_name = information_schema.columns.table_name AND
            information_schema.columns.table_schema = ANY (current_schemas(false)) AND
            column_name = 'updated_at' AND
            INFORMATION_SCHEMA.tables.table_type <> 'VIEW'
    LOOP
        EXECUTE format('CREATE OR REPLACE TRIGGER updated_at_trigger
                        BEFORE INSERT OR UPDATE ON %I.%I
                        FOR EACH ROW
                        EXECUTE PROCEDURE updated_at_trigger();',
                        t.table_schema, t.table_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;
