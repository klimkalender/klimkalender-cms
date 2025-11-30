import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react';
import {  readProfiles, readVenues, } from '@/data/supabase';
import { VenuesTable } from '@/components/VenuesTable';
import type { Profile, Venue } from '@/types';
import { z } from 'zod';

const venuesSearchSchema = z.object({
  venueId: z.string().optional(),
});

export const Route = createFileRoute('/_auth/venues')({
  validateSearch: venuesSearchSchema,
  component: VenuesRoute,
})


function VenuesRoute() {
  const [venues, setVenues] = useState<Venue[]|null>(null);
  const [profiles, setProfiles] = useState<Profile[]|null>(null);
  const { venueId } = Route.useSearch();

  useEffect(() => {
    readVenues(setVenues);
    readProfiles(setProfiles);
  }, []);


  return (
    <div className="p-2 grid gap-2">
      <div>{venues && profiles && <VenuesTable venues={venues} profiles={profiles} initialVenueId={venueId} />}</div>
    </div>
  )

}
