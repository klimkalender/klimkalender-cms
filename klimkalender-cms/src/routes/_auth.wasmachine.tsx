import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react';
import { readLastBoulderBotAction, readEvents, readWasmEvents, readOrganizers, readTags, readTagsMap, readVenues, } from '@/data/supabase';
import type { Organizer, Tag, Venue, Action, WasmEvent, Event} from '@/types';
import { WasmachineTable } from '@/components/WasmachineTable';

export const Route = createFileRoute('/_auth/wasmachine')({
  component: WasmachineRoute,
})


function WasmachineRoute() {
  const [wasmEvents, setWasmEvents] = useState<WasmEvent[]|null>(null);
  const [events, setEvents] = useState<Event[]|null>(null);
  const [venues, setVenues] = useState<Venue[]|null>(null);
  const [tagsPerEvent, setTagsPerEvent] = useState<{ [id: number]: Tag[] }|null>(null);
  const [allTags, setAllTags] = useState<Tag[]|null>(null);
  const [organizers, setOrganizers] = useState<Organizer[]|null>(null);
  const [lastBoulderBotAction, setLastBoulderBotAction] = useState<Action | null | undefined>(null);

  useEffect(() => {
    readWasmEvents(setWasmEvents);
    readEvents(setEvents);
    readVenues(setVenues);
    readTagsMap(setTagsPerEvent);
    readOrganizers(setOrganizers);
    readTags(setAllTags);
    readLastBoulderBotAction(setLastBoulderBotAction)
  }, []);



  return (
    <div className="p-2 grid gap-2">
         <div>{venues && wasmEvents &&events && tagsPerEvent && organizers && allTags && lastBoulderBotAction &&
           <WasmachineTable wasmEvents={wasmEvents} events={events} venues={venues} tagsPerEvent={tagsPerEvent}  allTags={allTags} organizers={organizers} action={lastBoulderBotAction} />
         }</div>
    </div>
  )

}
