import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react';
import { readOrganizers, } from '@/data/supabase';

import type { Organizer, } from '@/types';
import { OrganizersTable } from '@/components/OrganizersTable';

export const Route = createFileRoute('/_auth/organizers')({
  component: OrganizersRoute,
})


function OrganizersRoute() {
  const [organizers, setOrganizers] = useState<Organizer[] | null>(null);

  useEffect(() => {
    readOrganizers(setOrganizers);
  }, []);


  return (
    <div className="p-2 grid gap-2">
      <div>{organizers && <OrganizersTable organizers={organizers} />}</div>
    </div>
  )

}
