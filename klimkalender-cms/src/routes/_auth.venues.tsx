import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react';
import {  readVenues, } from '@/data/supabase';
import { VenuesTable } from '@/components/VenuesTable';
import type { Venue } from '@/types';

export const Route = createFileRoute('/_auth/venues')({
  // loader: async () => ({
  //   invoices: await fetchInvoices(),
  // }),
  component: VenuesRoute,
})


function VenuesRoute() {
  const [venues, setVenues] = useState<Venue[]|null>(null);

  useEffect(() => {

    readVenues(setVenues);

  }, []);


  return (
    <div className="p-2 grid gap-2">
      <div>{venues && <VenuesTable venues={venues} />}</div>
    </div>
  )

}
