import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react';
import { readTags, } from '@/data/supabase';

import type { Tag, } from '@/types';
import { TagsTable } from '@/components/TagsTable';

export const Route = createFileRoute('/_auth/tags')({
  component: TagsRoute,
})


function TagsRoute() {
  const [tags, setTags] = useState<Tag[] | null>(null);

  useEffect(() => {
    readTags(setTags);
  }, []);


  return (
    <div className="p-2 grid gap-2">
      <div>{tags && <TagsTable tags={tags} />}</div>
    </div>
  )

}
