import 'dotenv/config'
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv'
import type { CalendarEvent } from '../../src/types.ts';

dotenv.config({ path: '/workspace/klimkalender-cms/.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

function getPublicImageUrl(ref: string, bucket: string): string | null {
  const { data } = supabase.storage.from(bucket).getPublicUrl(ref);
  return data?.publicUrl || null;
}

async function exportData() {

  let { data: eventResp, error } = await supabase
    .from('events')
    .select(`
        id,
        title,
        start_date_time,
        end_date_time,
        external_id,
        featured,
        featured_image_ref,
        featured_text,
        is_full_day,
        link,
        organizer_id,
        remarks,
        status,
        time_zone,
        venue_id,
        created_at,
        updated_at,
        venue: venues (id, name, image_ref, full_address),
        organizer: organizers (id, name, image_ref),
        tags: event_tags (tag_id, tags!inner (name) )
      `)
    .eq('status', 'PUBLISHED')
    .gte('start_date_time', new Date().toISOString())
    .order('start_date_time', { ascending: true })
    .limit(13);

  console.dir(eventResp, { depth: null });

  if (!eventResp) {
    console.error('No events found or error fetching events:', error);
    return;
  }

  // any types because of this issue https://github.com/supabase/supabase-js/issues/1375
  const exportedEvents: CalendarEvent[] = [];
  for (const event of eventResp) {
    const organizerName = (event.organizer as any)?.name;
    const extraTag = organizerName || undefined;
    const tags = event.tags.map(t => (t.tags as any).name);
    if (extraTag && !tags.includes(extraTag)) {
      tags.push(extraTag);
    }
    let featuredImageUrl: string | null = null;
    if (event.featured && event.featured_image_ref) {
      featuredImageUrl = getPublicImageUrl(event.featured_image_ref, 'event-images');
    }
    // use organizer image as venue image if organizer is available
    let venueImageUrl: string | null = null;
    if ((event.organizer as any)?.image_ref) {
      venueImageUrl = getPublicImageUrl((event.organizer as any).image_ref, 'organizer-images');
    }
    if (!venueImageUrl && (event.venue as any)?.image_ref) {
      venueImageUrl = getPublicImageUrl((event.venue as any).image_ref, 'venue-images');
    }
    const featured = event.featured || false;

    exportedEvents.push({
      id: event.id,
      title: event.title,
      date: event.start_date_time,
      startTimeUtc: event.start_date_time,
      endTimeUtc: event.end_date_time,
      timezone: event.time_zone,
      venueName: (event.venue as any).name,
      venueImage: venueImageUrl || '',
       venueAddress: (event.venue as any).full_address,
      link: event.link,
      tags,
      featured: featured,
      featuredImage: featured ? (featuredImageUrl || undefined) : undefined,
      featuredText: featured ? event.featured_text : undefined,
    });

  }
   console.dir(exportedEvents, { depth: null });

  if (error) {
    console.error('Error exporting event:', error);
  }
}


await exportData();