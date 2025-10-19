import { createFileRoute } from '@tanstack/react-router'
import { EventsTable } from '@/components/EventsTable';
import type { Organizer, Venue, Event } from '@/types';
import { useState, useEffect } from 'react';
import { readEvents, readOrganizers, readTagsMap, readVenues } from '@/data/supabase';

export const Route = createFileRoute('/_auth/events')({
  // loader: async () => ({
  //   invoices: await fetchInvoices(),
  // }),
  component: EventsRoute,
})

function EventsRoute() {
  const [events, setEvents] = useState<Event[]|null>(null);
  const [venues, setVenues] = useState<Venue[]|null>(null);
  const [tags, setTags] = useState<{ [id: string]: string[] }|null>(null);
  const [organizers, setOrganizers] = useState<Organizer[]|null>(null);

  useEffect(() => {
    readEvents(setEvents);
    readVenues(setVenues);
    readTagsMap(setTags);
    readOrganizers(setOrganizers);
  }, []);


  return (
    <div className="p-2 grid gap-2">
      <div>{venues && events && tags && organizers &&
        <EventsTable events={events} venues={venues} tags={tags} organizers={organizers} />
      }</div>
    </div>
  )

}
