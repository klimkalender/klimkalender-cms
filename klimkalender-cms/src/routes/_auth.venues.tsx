import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react';
import {  readVenues, } from '@/data/supabase';
import { VenuesTable } from '@/components/VenuesTable';
import type { Venue } from '@/types';
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
  const { venueId } = Route.useSearch();

  useEffect(() => {

    readVenues(setVenues);

  }, []);


  return (
    <div className="p-2 grid gap-2">
      <div>{venues && <VenuesTable venues={venues} initialVenueId={venueId} />}</div>
    </div>
  )

}
