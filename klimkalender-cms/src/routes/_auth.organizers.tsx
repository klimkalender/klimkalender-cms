import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react';
import { readOrganizers, } from '@/data/supabase';

import type { Organizer, } from '@/types';
import { OrganizersTable } from '@/components/OrganizersTable';
import { z } from 'zod';

const organizersSearchSchema = z.object({
  organizerId: z.string().optional(),
});

export const Route = createFileRoute('/_auth/organizers')({
  validateSearch: organizersSearchSchema,
  component: OrganizersRoute,
})


function OrganizersRoute() {
  const [organizers, setOrganizers] = useState<Organizer[]|null>(null);
  const { organizerId } = Route.useSearch();

  useEffect(() => {
    readOrganizers(setOrganizers);
  }, []);


  return (
    <div className="p-2 grid gap-2">
      <div>{organizers && <OrganizersTable organizers={organizers} initialOrganizerId={organizerId} />}</div>
    </div>
  )

}
