import 'dotenv/config'
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import dotenv from 'dotenv'
import type { CalendarEvent, SupabaseEvent } from '../../src/types';
import { isDateFullDate } from '../../src/utils.ts';

dotenv.config({ path: '/workspace/klimkalender-cms/.env.local' })


const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);




function mapEventToSupabaseRow(event: CalendarEvent): SupabaseEvent {
  return {
    external_id: event.id,
    title: event.title,
    start_date_time: event.startTimeUtc,
    end_date_time: event.endTimeUtc,
    is_full_day: isDateFullDate(event),
    time_zone: event.timezone,
    status: 'PUBLISHED', // Default status, can be changed later
    // venue_name: event.venueName,
    // venue_image: event.venueImage,
    link: event.link,
    featured: event.featured || false,
    featured_text: event.featuredText || '',
  };
}

async function importData() {
  // read data from JSON file
  const rawData = JSON.parse(fs.readFileSync('../../../data/events.json', 'utf-8'));
  const events: CalendarEvent[] = rawData.map((event: any) => ({
    ...event,
    date: new Date(event.date),
    startTimeUtc: new Date(event.startTimeUtc),
    endTimeUtc: new Date(event.endTimeUtc),
  }));

  for (const event of events.slice(0, 1)) { // limit to first 1 event for testing
    const eventRow = mapEventToSupabaseRow(event);
    console.dir(eventRow, { depth: null });
    let { data, error } = await supabase
      .from('events')
      .upsert(eventRow, { onConflict: 'external_id' });
    if (error) {
      console.error('Error importing event:', error);
    }

    const { data: venueData, error:  venueError } = await supabase
      .from('venues')
      .upsert({ name: event.venueName }, { onConflict: 'name' });

    let venueId = await supabase
      .from('venues')
      .select('id')
      .eq('name', event.venueName)
      .single();
    
    await supabase
      .from('events')
      .update({ venue_id: venueId?.data?.id || null })
      .eq('external_id', event.id);

    if (venueError) {
      console.error('Error importing venue:', venueError);
    }

  }
}

await importData();