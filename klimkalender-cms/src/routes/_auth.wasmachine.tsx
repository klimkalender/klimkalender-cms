import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react';
import { readLastBoulderBotAction, readEvents, readWasmEvents, readOrganizers, readTags, readTagsMap, readVenues, readProfiles, } from '@/data/supabase';
import type { Organizer, Tag, Venue, Action, WasmEvent, Event, Profile} from '@/types';
import { WasmachineTable } from '@/components/WasmachineTable';
import { z } from 'zod';

const wasmachineSearchSchema = z.object({
  wasmEventId: z.string().optional(),
});

export const Route = createFileRoute('/_auth/wasmachine')({
  validateSearch: wasmachineSearchSchema,
  component: WasmachineRoute,
})


function WasmachineRoute() {
  const [wasmEvents, setWasmEvents] = useState<WasmEvent[]|null>(null);
  const [events, setEvents] = useState<Event[]|null>(null);
  const [venues, setVenues] = useState<Venue[]|null>(null);
  const [tagsPerEvent, setTagsPerEvent] = useState<{ [id: number]: Tag[] }|null>(null);
  const [allTags, setAllTags] = useState<Tag[]|null>(null);
  const [organizers, setOrganizers] = useState<Organizer[]|null>(null);
  const [profiles, setProfiles] = useState<Profile[]|null>(null);
  const [lastBoulderBotAction, setLastBoulderBotAction] = useState<Action | null | undefined>(undefined);

  const { wasmEventId } = Route.useSearch();

  useEffect(() => {
    readWasmEvents(setWasmEvents);
    readEvents(setEvents);
    readVenues(setVenues);
    readTagsMap(setTagsPerEvent);
    readOrganizers(setOrganizers);
    readTags(setAllTags);
    readProfiles(setProfiles);
    readLastBoulderBotAction(setLastBoulderBotAction)
  }, []);



  return (
    <div className="p-2 grid gap-2">
         <div>{venues && wasmEvents &&events && tagsPerEvent && organizers && allTags && lastBoulderBotAction  !== undefined&& profiles &&
           <WasmachineTable wasmEvents={wasmEvents} events={events} venues={venues} tagsPerEvent={tagsPerEvent}  allTags={allTags} organizers={organizers} profiles={profiles} action={lastBoulderBotAction} initialWasmEventId={wasmEventId} />
         }</div>
    </div>
  )

}
