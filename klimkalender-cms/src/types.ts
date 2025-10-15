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



export type SupabaseEvent = {
  id?: string;
  external_id: string;
  title: string;
  // date: Date;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  start_date_time: Date;
  is_full_day: boolean;
  end_date_time: Date;
  time_zone: string;
  // venue_name: string;
  // venue_image: string;
  link: string;
  featured?: boolean;
  featured_image?: string;
  featured_text?: string;
};
