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
};

export type Event = Database['public']['Tables']['events']['Row'];
export type Venue = Database['public']['Tables']['venues']['Row'];
export type Organizer = Database['public']['Tables']['organizers']['Row'];

