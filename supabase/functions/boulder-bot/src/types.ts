import type { Database } from "./database.types";

export type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  startTimeUtc: Date;
  endTimeUtc: Date;
  timezone: string;
  venueName: string;
  venueImage: string;
  link: string;
  tags: string[];
  featured?: boolean;
  featuredImage?: string;
  featuredText?: string;
  venueAddress?: string;
};

export type Event = Database['public']['Tables']['events']['Row'];
export type WasmEvent = Database['public']['Tables']['wasm_events']['Row'];
export type Venue = Database['public']['Tables']['venues']['Row'];
export type Organizer = Database['public']['Tables']['organizers']['Row'];
export type Tag = Database['public']['Tables']['tags']['Row'];
export type Action = Database['public']['Tables']['actions']['Row'];
export type ActionLog = Database['public']['Tables']['action_logs']['Row'];
export type WasmClassification = Database['public']['Enums']['wasm_event_classification'];
export type WasmEventDataOnly = Pick<WasmEvent, 'external_id' | 'name' | 'classification' | 'date' | 'hall_name' | 'short_description' | 'full_description_html' | 'event_url' | 'image_url' | 'event_category'>;
