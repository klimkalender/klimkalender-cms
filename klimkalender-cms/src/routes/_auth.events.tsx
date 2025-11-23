import { createFileRoute } from '@tanstack/react-router'
import { EventsTable } from '@/components/EventsTable';
import type { Organizer, Venue, Event, Tag } from '@/types';
import { useState, useEffect } from 'react';
import { readEvents, readOrganizers, readTags, readTagsMap, readVenues } from '@/data/supabase';
import { z } from 'zod';

const eventsSearchSchema = z.object({
  eventId: z.string().optional(),
});

export const Route = createFileRoute('/_auth/events')({
  validateSearch: eventsSearchSchema,
  component: EventsRoute,
})

function EventsRoute() {
  const [events, setEvents] = useState<Event[]|null>(null);
  const [venues, setVenues] = useState<Venue[]|null>(null);
  const [tagsPerEvent, setTagsPerEvent] = useState<{ [id: number]: Tag[] }|null>(null);
  const [allTags, setAllTags] = useState<Tag[]|null>(null);
  const [organizers, setOrganizers] = useState<Organizer[]|null>(null);
  const { eventId } = Route.useSearch();

  useEffect(() => {
    readEvents(setEvents);
    readVenues(setVenues);
    readTagsMap(setTagsPerEvent);
    readOrganizers(setOrganizers);
    readTags(setAllTags);
  }, []);


  return (
    <div className="p-2 grid gap-2">
      <div>{venues && events && tagsPerEvent && organizers && allTags &&
        <EventsTable events={events} venues={venues} tagsPerEvent={tagsPerEvent}  allTags={allTags} organizers={organizers} initialEventId={eventId} />
      }</div>
    </div>
  )

}
