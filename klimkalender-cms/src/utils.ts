import type { CalendarEvent } from './types';
import { DateTime, type DateTimeFormatOptions } from 'luxon';


export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const formatTimestamp = (
  timestamp: string,
  timezone?: string,
  localeStringSettings?: DateTimeFormatOptions
): string | null => {
  const defaultLocaleStringSettings: DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    second: '2-digit'
  };
  const parsedTimeObject = DateTime.fromISO(timestamp);

  if (!parsedTimeObject.isValid) {
    return null;
  }

  const formattedDateTime = parsedTimeObject
    .setZone(timezone)
    .setLocale('nl-NL')
    .toLocaleString(localeStringSettings || defaultLocaleStringSettings);

  return formattedDateTime;
};


export const getBrowserLocale = (): string | undefined => {
  if (!(window.navigator.languages.length === 0)) {
    return window.navigator.languages[0];
  }
  return window.navigator.language;
};




export const isDateFullDate = (event: CalendarEvent): boolean => {
  const timeStart = formatTimestamp(event.startTimeUtc.toISOString(), event.timezone, {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit'
  });
  const timeEnd = formatTimestamp(event.endTimeUtc.toISOString(), event.timezone, {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit'
  });
  const isFullDate = timeStart === '00:00' && timeEnd === '00:00' || timeEnd === '23:59';
  return isFullDate;
}
