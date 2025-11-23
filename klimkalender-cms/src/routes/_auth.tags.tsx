import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react';
import { readTags, } from '@/data/supabase';

import type { Tag, } from '@/types';
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
  const { tagId } = Route.useSearch();

  useEffect(() => {
    readTags(setTags);
  }, []);


  return (
    <div className="p-2 grid gap-2">
      <div>{tags && <TagsTable tags={tags} initialTagId={tagId} />}</div>
    </div>
  )

}
