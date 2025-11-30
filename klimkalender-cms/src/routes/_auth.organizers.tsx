import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react';
import { readOrganizers, readProfiles, } from '@/data/supabase';

import type { Organizer, Profile, } from '@/types';
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
  const [profiles, setProfiles] = useState<Profile[]|null>(null);
  const { organizerId } = Route.useSearch();

  useEffect(() => {
    readOrganizers(setOrganizers);
    readProfiles(setProfiles);  
  }, []);


  return (
    <div className="p-2 grid gap-2">
      <div>{organizers && profiles && <OrganizersTable organizers={organizers} profiles={profiles} initialOrganizerId={organizerId} />}</div>
    </div>
  )

}
