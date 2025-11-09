-- CreateEnum
CREATE TYPE "wasm_event_classification" AS ENUM ('UNKNOWN', 'COMPETITION', 'NOCOMPETITION');

-- CreateEnum
CREATE TYPE "wasm_event_category" AS ENUM ('OTHER', 'BOULDER', 'LEAD');

-- CreateEnum
CREATE TYPE "wasm_action" AS ENUM ('IGNORE', 'MANUAL_IMPORT', 'AUTO_IMPORT');

-- CreateEnum
CREATE TYPE "wasm_event_status" AS ENUM ('NEW', 'IGNORED', 'UP_TO_DATE', 'CHANGED', 'REMOVED', 'EVENT_PASSED');

-- CreateTable
CREATE TABLE "wasm_events" (
    "id" SERIAL NOT NULL,
    "external_id" TEXT NOT NULL,
    "hall_name" TEXT,
    "name" TEXT NOT NULL,
    "date" TIMESTAMPTZ(3) NOT NULL,
    "image_url" TEXT,
    "short_description" TEXT,
    "full_description_html" TEXT,
    "event_url" TEXT,
    "classification" "wasm_event_classification" NOT NULL,
    "event_category" "wasm_event_category" NOT NULL,
    "record_start_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "record_end_at" TIMESTAMPTZ(3),

    CONSTRAINT "wasm_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wasm_event_links" (
    "id" SERIAL NOT NULL,
    "event_id" TEXT NOT NULL,
    "wasm_event_id" INTEGER NOT NULL,
    "external_id" TEXT NOT NULL,
    "action" "wasm_action" NOT NULL,
    "processed_at" TIMESTAMPTZ(3),
    "accepted_name" TEXT,
    "accepted_date" TIMESTAMPTZ(3),
    "accepted_image_url" TEXT,
    "accepted_short_description" TEXT,
    "accepted_full_description_html" TEXT,
    "accepted_event_url" TEXT,
    "accepted_classification" "wasm_event_classification" NOT NULL,
    "status" "wasm_event_status" NOT NULL,
    "accepted_hall_name" TEXT,
    "accepted_event_category" "wasm_event_category" NOT NULL,
    "record_start_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "record_end_at" TIMESTAMPTZ(3),

    CONSTRAINT "wasm_event_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wasm_events_external_id_key" ON "wasm_events"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "wasm_event_links_event_id_key" ON "wasm_event_links"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "wasm_event_links_wasm_event_id_key" ON "wasm_event_links"("wasm_event_id");

-- AddForeignKey
ALTER TABLE "wasm_event_links" ADD CONSTRAINT "wasm_event_links_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("external_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wasm_event_links" ADD CONSTRAINT "wasm_event_links_wasm_event_id_fkey" FOREIGN KEY ("wasm_event_id") REFERENCES "wasm_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE OR REPLACE FUNCTION updated_at_trigger() RETURNS trigger
   LANGUAGE plpgsql AS
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


-- create policy "public can access wasm_events"
-- on public.wasm_events
-- for all to authenticated
-- using (true);


-- create policy "public can access wasm_event_links"
-- on public.wasm_event_links
-- for all to authenticated
-- using (true);
