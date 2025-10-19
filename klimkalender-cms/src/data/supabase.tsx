import type { Database } from "@/database.types";
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
}[] | null>>
) {
  const { data, error } = await supabase.from("events").select().order("start_date_time", { ascending: true });
  if (data) setEvents(data);
  if (error) console.error("Error fetching events:", error);
}


export async function readVenues(setVenues: React.Dispatch<React.SetStateAction<{
  id: number;
  image_ref: string | null;
  lat: number | null;
  long: number | null;
  name: string;
  created_at: string;
  updated_at: string;
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
}[] | null>>) {
  const { data, error } = await supabase.from("organizers").select().order("name", { ascending: true });
  if (data) setOrganizers(data);
  console.dir(data);
  if (error) console.error("Error fetching organizers:", error);
}

export async function readTags(setTags: React.Dispatch<React.SetStateAction<{
  id: number;
  name: string;
}[] | null>>) {
  const { data, error } = await supabase.from("tags").select().order("name", { ascending: true });
  if (data) setTags(data);
  console.dir(data);
  if (error) console.error("Error fetching tags:", error);
}

export async function readTagsMap(setTags: React.Dispatch<React.SetStateAction<{
  [id: string]: string[];
} | null>>) {
  const { data, error } = await supabase.from("event_tags").select('event_id, tags (name)');
  if (data) {
    const tagsMap: { [id: string]: string[] } = {};
    // supabase has typing wrong here, so we need to cast
    const fixedData = data as unknown as {
      event_id: any;
      tags: {
        name: any;
      };
    }[];
    fixedData.forEach(tag => {
      if (!tagsMap[tag.event_id]) {
        tagsMap[tag.event_id] = [];
      }
      // console.dir(tag.tags.name);
      tagsMap[tag.event_id].push(tag.tags.name);
    });
    // console.dir(tagsMap);
    setTags(tagsMap);
  }
  if (error) console.error("Error fetching tags:", error);
}

export function getImageUrl(imageRef: string | null, bucket: string) {
  if (!imageRef) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(imageRef);
  console.dir(data);
  return data?.publicUrl;
}

export function getImageTag(imageRef: string | null, bucket: string) {
  console.log(`${imageRef}, ${bucket}`);
  const url = getImageUrl(imageRef, bucket);
  if (!url) return '-';
  return <img src={url} alt="Venue Image" style={{ maxWidth: '20px', maxHeight: '20px' }} />;
}
