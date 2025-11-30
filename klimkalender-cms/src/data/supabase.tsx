import type { Database } from "@/database.types";
import type { Tag, WasmEvent, Event } from "@/types";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

export async function readEvents(setEvents: React.Dispatch<React.SetStateAction<{
  end_date_time: string;
  external_id: string | null;
  featured: boolean | null;
  featured_image_ref: string | null;
  featured_text: string | null;
  id: number;
  is_full_day: boolean;
  link: string | null;
  organizer_id: number | null;
  remarks: string | null;
  start_date_time: string;
  status: Database["public"]["Enums"]["EventStatus"];
  time_zone: string;
  title: string;
  venue_id: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}[] | null>>
) {
  const { data, error } = await supabase.from("events").select().order("start_date_time", { ascending: true });
  if (data) setEvents(data);
  if (error) console.error("Error fetching events:", error);
}


export async function readWasmEvents(setWasmEvents: React.Dispatch<React.SetStateAction<WasmEvent[] | null>>
) {
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const { data, error } = await supabase.from("wasm_events").select().gte("date", twoMonthsAgo.toISOString()).order("date", { ascending: true });
  if (data) setWasmEvents(data);
  if (error) console.error("Error fetching wasm_events:", error);
}


export async function readVenues(setVenues: React.Dispatch<React.SetStateAction<{
  id: number;
  image_ref: string | null;
  lat: number | null;
  long: number | null;
  name: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}[] | null>>) {
  const { data, error } = await supabase.from("venues").select().order("name", { ascending: true });
  if (data) setVenues(data);
  if (error) console.error("Error fetching venues:", error);
}

export async function readOrganizers(setOrganizers: React.Dispatch<React.SetStateAction<{
  id: number;
  image_ref: string | null;
  name: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}[] | null>>) {
  const { data, error } = await supabase.from("organizers").select().order("name", { ascending: true });
  if (data) setOrganizers(data);
  if (error) console.error("Error fetching organizers:", error);
}

export async function readTags(setTags: React.Dispatch<React.SetStateAction<{
  id: number;
  name: string;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}[] | null>>) {
  const { data, error } = await supabase.from("tags").select().order("name", { ascending: true });
  if (data) setTags(data);
  if (error) console.error("Error fetching tags:", error);
}

export async function readProfiles(setProfiles: React.Dispatch<React.SetStateAction<{
  id: string;
  avatar_url: string | null;
  full_name: string | null;
  username: string | null;
  created_at: string | null;
  updated_at: string | null;
}[] | null>>) {
  const { data, error } = await supabase.from("profiles").select();
  if (data) setProfiles(data);
  if (error) console.error("Error fetching tags:", error);
}

export async function readTagsMap(setTags: React.Dispatch<React.SetStateAction<{
  [id: number]: Tag[];
} | null>>) {
  const { data: tagsData } = await supabase.from("tags").select();
  const { data, error } = await supabase.from("event_tags").select('event_id, tag_id');
  if (data) {
    const tagsMap: { [id: number]: Tag[] } = {};

    data.forEach((et) => {
      const tag = tagsData?.find(t => t.id === et.tag_id);
      if (tag) {
        if (!tagsMap[et.event_id]) {
          tagsMap[et.event_id] = [];
        }
        tagsMap[et.event_id].push(tag);
      }
    });
    setTags(tagsMap);
  }
  if (error) console.error("Error fetching tags:", error);
}

export function getImageUrl(imageRef: string | null, bucket: string) {
  if (!imageRef) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(imageRef);
  return data?.publicUrl;
}

export function getImageTag(imageRef: string | null, bucket: string) {
  const url = getImageUrl(imageRef, bucket);
  if (!url) return '-';
  return <img src={url} alt="Venue Image" style={{ maxWidth: '20px', maxHeight: '20px' }} />;
}

export async function readLastBoulderBotAction(setAction: React.Dispatch<React.SetStateAction<Database["public"]["Tables"]["actions"]["Row"] | null | undefined>>) {
  const { data, error } = await supabase
    .from('actions')
    .select('*')
    .eq('type', 'BOULDERBOT')
    .order('id', { ascending: false })
    .limit(1)
    .single();
  if (error) {
    console.error('Error fetching last BoulderBot action:', error);
    setAction(null);
  }
  setAction(data);
};

export async function getActionLog(setLogs: React.Dispatch<React.SetStateAction<Database["public"]["Tables"]["action_logs"]["Row"][] | null>>, actionId: number) {
  const { data, error } = await supabase
    .from('action_logs')
    .select('*')
    .eq('action_id', actionId)
    .order('datetime', { ascending: false });
  if (error) {
    console.error('Error fetching action logs:', error);
    return null;
  }
  setLogs(data);
  if (error) {
    console.error('Error fetching action logs:', error);
    return null;
  }
}

export async function createEvent(wasmEvent: WasmEvent, venueId: number, status: 'PUBLISHED' | 'DRAFT'): Promise<Event | null> {
  // Calculate end of day in European timezone (CET/CEST)
  // hmm... is this correct?
  const eventDate = new Date(wasmEvent.date);
  const endOfDay = new Date(eventDate);
  endOfDay.setHours(23, 59, 59, 999);
  const endDateTime = endOfDay.toISOString();
  const { data, error } = await supabase
    .from('events')
    .insert([{
      title: wasmEvent.name,
      start_date_time: wasmEvent.date,
      end_date_time: endDateTime,
      external_id: wasmEvent.external_id,
      link: wasmEvent.event_url,
      organizer_id: null,
      venue_id: venueId,
      featured_text: wasmEvent.short_description || null,
      is_full_day: true,
      status: status,
    }])
    .select()
    .single();
  if (error) {
    console.error('Error creating new Wasm Event:', error);
    return null;
  }
  console.dir(data);
  return data;
}

export async function updateWasmEvent(wasmEvent: WasmEvent) {
  const { data, error } = await supabase
    .from('wasm_events')
    .update({
      accepted_name: wasmEvent.accepted_name,
      accepted_classification: wasmEvent.accepted_classification,
      accepted_date: wasmEvent.accepted_date,
      accepted_hall_name: wasmEvent.accepted_hall_name,
      accepted_short_description: wasmEvent.accepted_short_description,
      accepted_full_description_html: wasmEvent.accepted_full_description_html,
      accepted_event_url: wasmEvent.accepted_event_url,
      accepted_image_url: wasmEvent.accepted_image_url,
      accepted_event_category: wasmEvent.accepted_event_category,
      event_id: wasmEvent.event_id,
      status: wasmEvent.status,
      action: wasmEvent.action,
    })
    .eq('id', wasmEvent.id)
    .select()
    .single();
  if (error) {
    console.error('Error updating Wasm Event:', error);
    return null;
  }
  return data;
}


export async function uploadRemoteImageToSupabase(imageUrl: string, bucket: string, prefix?: string): Promise<string | undefined> {
  const extension = imageUrl.split('.').pop() || '';
  const imageName = imageUrl.split('/').pop();
  const imagePrefix = prefix ? `${prefix}` : Math.random().toString(36).substring(2, 6);
  console.log(imageUrl);
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
