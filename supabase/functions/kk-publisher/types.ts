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
