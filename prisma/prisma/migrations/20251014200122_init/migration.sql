-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "external_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "start_date_time" TIMESTAMP(3) NOT NULL,
    "end_date_time" TIMESTAMP(3) NOT NULL,
    "is_full_day" BOOLEAN NOT NULL DEFAULT false,
    "time_zone" TEXT NOT NULL DEFAULT 'Europe/Amsterdam',
    "venue_id" INTEGER,
    "organizer_id" INTEGER,
    "featured" BOOLEAN DEFAULT false,
    "featured_text" TEXT,
    "featured_image_ref" TEXT,
    "remarks" TEXT,
    "link" TEXT,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_tags" (
    "eventId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "organizers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "image_ref" TEXT,

    CONSTRAINT "organizers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "image_ref" TEXT,
    "lat" DOUBLE PRECISION,
    "long" DOUBLE PRECISION,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_external_id_key" ON "events"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "event_tags_eventId_tagId_key" ON "event_tags"("eventId", "tagId");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "organizers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- create policy "public can access venues"
-- on public.venues
-- for all to authenticated
-- using (true);
-- create policy "public can access organizers"
-- on public.organizers
-- for all to authenticated
-- using (true);       
-- create policy "public can access events"
-- on public.events
-- for all to authenticated
-- using (true);       
-- create policy "public can access tags"
-- on public.tags
-- for all to authenticated
-- using (true);
-- create policy "public can access event_tags"
-- on public.event_tags
-- for all to authenticated
-- using (true);
