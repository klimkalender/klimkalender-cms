import { createFileRoute } from '@tanstack/react-router'
import { EventsTable } from '@/components/EventsTable';
import type { Organizer, Venue, Event, Tag } from '@/types';
import { useState, useEffect } from 'react';
import { readEvents, readOrganizers, readTags, readTagsMap, readVenues } from '@/data/supabase';

export const Route = createFileRoute('/_auth/events')({
  // loader: async () => ({
  //   invoices: await fetchInvoices(),
  // }),
  component: EventsRoute,
})

function EventsRoute() {
  const [events, setEvents] = useState<Event[]|null>(null);
  const [venues, setVenues] = useState<Venue[]|null>(null);
  const [tagsPerEvent, setTagsPerEvent] = useState<{ [id: number]: Tag[] }|null>(null);
  const [allTags, setAllTags] = useState<Tag[]|null>(null);
  const [organizers, setOrganizers] = useState<Organizer[]|null>(null);

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
        <EventsTable events={events} venues={venues} tagsPerEvent={tagsPerEvent}  allTags={allTags} organizers={organizers} />
      }</div>
    </div>
  )

}
