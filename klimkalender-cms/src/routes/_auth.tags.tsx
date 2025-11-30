import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react';
import { readProfiles, readTags, } from '@/data/supabase';

import type { Profile, Tag, } from '@/types';
import { TagsTable } from '@/components/TagsTable';
import { z } from 'zod';

const tagsSearchSchema = z.object({
  tagId: z.string().optional(),
});

export const Route = createFileRoute('/_auth/tags')({
  validateSearch: tagsSearchSchema,
  component: TagsRoute,
})


function TagsRoute() {
  const [tags, setTags] = useState<Tag[]|null>(null);
  const [profiles, setProfiles] = useState<Profile[]|null>(null);
  const { tagId } = Route.useSearch();

  useEffect(() => {
    readTags(setTags);
    readProfiles(setProfiles);
  }, []);


  return (
    <div className="p-2 grid gap-2">
      <div>{tags && profiles && <TagsTable tags={tags} initialTagId={tagId} profiles={profiles} />}</div>
    </div>
  )

}
