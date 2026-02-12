import { Event } from './types';
import fs from 'fs';
import path from 'path';

let cachedEvents: Event[] | null = null;

/**
 * Load events from the JSON file
 * Caches results to avoid reading file on every request
 */
export function loadEvents(): Event[] {
  if (cachedEvents) {
    return cachedEvents;
  }

  try {
    const dataPath = path.join(process.cwd(), 'data', 'events.json');
    const fileContents = fs.readFileSync(dataPath, 'utf8');
    cachedEvents = JSON.parse(fileContents);
    return cachedEvents!;
  } catch (error) {
    console.error('Failed to load events:', error);
    return [];
  }
}

/**
 * Filter events by date range
 */
export function filterEventsByDateRange(
  events: Event[],
  startDate?: string,
  endDate?: string
): Event[] {
  let filtered = events;

  if (startDate) {
    filtered = filtered.filter(e => e.timestamp >= startDate);
  }

  if (endDate) {
    filtered = filtered.filter(e => e.timestamp <= endDate);
  }

  return filtered;
}
