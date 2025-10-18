import { createFileRoute } from '@tanstack/react-router'
import { fetchInvoices } from '../posts'
import { createClient } from '@supabase/supabase-js';
import TestTable from '@/components/EventsTable';
import type { Database } from '@/database.types';
import type { Organizer } from '@/types';
import { useState, useEffect } from 'react';

export const Route = createFileRoute('/_auth/events')({
  loader: async () => ({
    invoices: await fetchInvoices(),
  }),
  component: EventsRoute,
})

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

type Venue = Database['public']['Tables']['venues']['Row'];
type Event = Database['public']['Tables']['events']['Row'];

function EventsRoute() {
  const [events, setEvents] = useState<Event[]|null>(null);
  const [venues, setVenues] = useState<Venue[]|null>(null);
  const [tags, setTags] = useState<{ [id: string]: string[] }|null>(null);
  const [organizers, setOrganizers] = useState<Organizer[]|null>(null);

  useEffect(() => {
    readEvents();
    readVenues();
    readTags();
    readOrganizers();
  }, []);


  async function readEvents() {
    const { data, error } = await supabase.from("events").select().order("start_date_time", { ascending: true });
    if (data) setEvents(data);
    if (error) console.error("Error fetching events:", error);
  }

  async function readVenues() {
    const { data, error } = await supabase.from("venues").select().order("name", { ascending: true });
    if (data) setVenues(data);
    if (error) console.error("Error fetching venues:", error);
  }

  async function readOrganizers() {
    const { data, error } = await supabase.from("organizers").select().order("name", { ascending: true });
    if (data) setOrganizers(data);
    console.dir(data);
    if (error) console.error("Error fetching organizers:", error);
  }

  async function readTags() {
    const { data, error } = await supabase.from("event_tags").select('event_id, tags (name)');
    if (data) {
      const tagsMap: { [id: string]: string[] } = {};
      // supabase has typing wrong here, so we need to cast
      const fixedData = data as unknown as {
        event_id: any;
        tags: {
          name: any;
        };  
      }[];
      fixedData.forEach(tag => {
          if (!tagsMap[tag.event_id]) {
            tagsMap[tag.event_id] = [];
          }
          // console.dir(tag.tags.name);
          tagsMap[tag.event_id].push(tag.tags.name);
        });
      // console.dir(tagsMap);
      setTags(tagsMap);
    }
    if (error) console.error("Error fetching tags:", error);
  }



  return (
    <div className="p-2 grid gap-2">
      <div>{venues && events && tags && organizers &&
        <TestTable events={events} venues={venues} tags={tags} organizers={organizers} />
      }</div>
    </div>
  )

}
