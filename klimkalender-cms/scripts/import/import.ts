import 'dotenv/config'
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import dotenv from 'dotenv'
import type { CalendarEvent, Event } from '../../src/types';
import { isDateFullDate } from '../../src/utils.ts';

dotenv.config({ path: '/workspace/klimkalender-cms/.env.local' })

const NKBV_IMAGE = "https:\/\/www.klimkalender.nl\/wp-content\/uploads\/2024\/07\/variant.jpg";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);




function mapEventToSupabaseRow(event: CalendarEvent): Omit<Event, 'id'> {
  // Helper to decode HTML entities in the title
  function decodeHtmlEntities(str: string): string {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&#038;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&#96;/g, '`')
      .replace(/&nbsp;/g, ' ')
      .replace(/&hellip;/g, '…')
      .replace(/&#8211;/g, '–');
  }

  return {
    external_id: event.id,
    title: decodeHtmlEntities(event.title),
    start_date_time: event.startTimeUtc.toISOString(),
    end_date_time: event.endTimeUtc.toISOString(),
    is_full_day: isDateFullDate(event),
    time_zone: event.timezone,
    status: 'PUBLISHED', // Default status, can be changed later
    link: event.link,
    featured: event.featured || false,
    featured_text: event.featuredText || '',
    remarks: '', // No remarks in import data
    venue_id: null, // To be set after venue upsert
    organizer_id: null, // To be set after organizer upsert
    featured_image_ref: null, // To be set after image upload
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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

  for (const event of events) { //.slice(0, 1)) { // limit to first 1 event for testing
    const eventRow = mapEventToSupabaseRow(event);
    // console.dir(eventRow, { depth: null });
    console.dir(event, { depth: null });

    // upsert event into Supabase
    let { data: eventResp, error } = await supabase
      .from('events')
      .upsert(eventRow, { onConflict: 'external_id' })
      .select('id, featured_image_ref')
      .single();
    if (error) {
      console.error('Error importing event:', error);
    }

    // upsert venue
    const { data: venueResp, error: venueError } = await supabase
      .from('venues')
      // remove city from venue name
      .upsert({ name: event.venueName.split(',')[0], full_address: event.venueAddress }, { onConflict: 'name' })
      .select('id, image_ref')
      .single();

    if (!venueResp?.image_ref) {
      // handle venue image
      if (event.venueImage) {
        if (event.venueImage == NKBV_IMAGE) {
          console.log('KNBV image detected - checking organizer image');

          await supabase
            .from('organizers')
            .upsert({ name: 'NKBV' }, { onConflict: 'name' });
          const orgResp = await supabase
            .from('organizers')
            .select('id, image_ref')
            .eq('name', 'NKBV')
            .single();
          if (!orgResp.data?.image_ref) {
            console.log('Uploading NKBV organizer image');
            const imagePath = await uploadRemoteImageToSupabase(NKBV_IMAGE, 'organizer-images', 'nkbv');
            if (imagePath) {
              await supabase
                .from('organizers')
                .update({ image_ref: imagePath })
                .eq('name', 'NKBV');
            }
          } else {
            console.log('NKBV organization image already exists, skipping upload');
          }
          // link organization event
          const { error: orgEventError } = await supabase
            .from('events')
            .update({ organizer_id: orgResp?.data?.id || null })
            .eq('external_id', event.id);
          if (orgEventError) {
            console.error('Error linking event to organizer:', orgEventError);
          } else {
            console.log(`Linked event ${event.id} to NKBV organizer ${orgResp?.data?.id}`);
          }
        } else {
          console.log('Uploading venue image for venue:', event.venueName);
          const imagePath = await uploadRemoteImageToSupabase(event.venueImage, 'venue-images');
          if (imagePath) {
            await supabase
              .from('venues')
              .update({ image_ref: imagePath })
              .eq('name', event.venueName);
          }
        }
      } else {
        console.log('Skipping venue image upload for venue:', event.venueName);
      }
    }

    // link venue to event
    await supabase
      .from('events')
      .update({ venue_id: venueResp?.id || null })
      .eq('external_id', event.id);

    if (event.featured && !eventResp?.featured_image_ref) {
      // handle featured image
      if (event.featuredImage) {
        const imagePath = await uploadRemoteImageToSupabase(event.featuredImage, 'event-images');
        if (imagePath) {
          await supabase
            .from('events')
            .update({ featured_image_ref: imagePath })
            .eq('external_id', event.id);
        }
      }
    } else {
      console.log('Skipping featured image upload for event:', event.id);
    }
    // exclude NKBV tag, it's handled via organization
    for (const tag of event.tags.filter(t => t !== 'NKBV')) {
      await addTagToEvent(eventResp!.id, tag);
    }

    if (venueError) {
      console.error('Error importing venue:', venueError);
    }

  }
}

async function addTagToEvent(eventId: string, tagName: string) {
  // upsert tag
  const { data: tagData, error: tagError } = await supabase
    .from('tags')
    .upsert({ name: tagName }, { onConflict: 'name' })
    .select('id')
    .single();
  if (tagError) {
    console.error('Error importing tag:', tagError);
    return;
  }

  // link tag to event
  const { error: eventTagError } = await supabase
    .from('event_tags')
    .upsert({ event_id: eventId, tag_id: tagData!.id }, { onConflict: 'event_id, tag_id' });
  if (eventTagError) {
    console.error('Error linking tag to event:', eventTagError);
    return;
  }
}

async function uploadRemoteImageToSupabase(imageUrl: string, bucket: string, prefix?: string): Promise<string | undefined> {
  const extension = imageUrl.split('.').pop() || '';
  const imageName = imageUrl.split('/').pop();
  const imagePrefix = prefix ? `${prefix}` : Math.random().toString(36).substring(2, 6);

  const response = await fetch(imageUrl);
  if (!response.ok) {
    console.error('Failed to fetch image:', response.statusText);
    return;
  }
  // map extension to content type
  const contentTypeMap: { [key: string]: string } = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
  };
  console.log('Uploading image:', imageName, extension, contentTypeMap[extension]);

  const imageBuffer = await response.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(`${imagePrefix}-${imageName}`, new Blob([imageBuffer], { type: contentTypeMap[extension] }), {
      upsert: true,
    });

  if (uploadError) {
    console.error('Error uploading image:', uploadError);
    return undefined
  }
  return `${imagePrefix}-${imageName}`;
}



// run the import

await importData();