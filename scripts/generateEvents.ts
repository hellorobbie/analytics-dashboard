import { Event, EventName, Variant, Device, Channel } from '../lib/types';
import fs from 'fs';
import path from 'path';

/**
 * Generate realistic mock analytics data
 *
 * Strategy:
 * - 500 users, 2000 sessions, ~10k events
 * - 7-day date range
 * - Realistic funnel drop-offs:
 *   - 100% page_view
 *   - 60% add_to_cart
 *   - 40% of cart → begin_checkout
 *   - 70% of checkout → purchase
 * - Each session belongs to one user, variant, device, channel
 * - Sessions can have repeat events (multiple page views)
 */

const NUM_USERS = 500;
const NUM_SESSIONS = 2000;
const DAYS_OF_DATA = 7;

// Conversion rates
const RATE_VIEW_TO_CART = 0.60;
const RATE_CART_TO_CHECKOUT = 0.40;
const RATE_CHECKOUT_TO_PURCHASE = 0.70;

// Distribution weights
const VARIANTS: Variant[] = ['A', 'B'];
const DEVICES: Device[] = ['mobile', 'desktop', 'tablet'];
const DEVICE_WEIGHTS = [0.6, 0.35, 0.05]; // Mobile-heavy, realistic for 2026

const CHANNELS: Channel[] = ['organic', 'paid_search', 'social', 'email', 'direct'];
const CHANNEL_WEIGHTS = [0.30, 0.25, 0.20, 0.15, 0.10];

// Revenue distribution (in cents)
const MIN_ORDER_VALUE = 2000; // $20
const MAX_ORDER_VALUE = 30000; // $300

function randomChoice<T>(items: T[], weights?: number[]): T {
  if (!weights) {
    return items[Math.floor(Math.random() * items.length)];
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }

  return items[items.length - 1];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateUserId(index: number): string {
  return `user_${String(index).padStart(5, '0')}`;
}

function generateSessionId(index: number): string {
  return `session_${String(index).padStart(6, '0')}`;
}

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateTimestamp(baseDate: Date, sessionIndex: number): Date {
  // Spread sessions across the date range
  const dayOffset = Math.floor((sessionIndex / NUM_SESSIONS) * DAYS_OF_DATA);
  const hourOffset = randomInt(8, 22); // Business hours + evening
  const minuteOffset = randomInt(0, 59);
  const secondOffset = randomInt(0, 59);

  const timestamp = new Date(baseDate);
  timestamp.setDate(timestamp.getDate() - (DAYS_OF_DATA - dayOffset - 1));
  timestamp.setHours(hourOffset, minuteOffset, secondOffset, 0);

  return timestamp;
}

function generateSessionEvents(
  sessionId: string,
  userId: string,
  variant: Variant,
  device: Device,
  channel: Channel,
  baseTimestamp: Date
): Event[] {
  const events: Event[] = [];
  let currentTime = new Date(baseTimestamp);

  // Helper to add event with incremental timestamp
  const addEvent = (eventName: EventName, value?: number) => {
    events.push({
      event_id: generateEventId(),
      timestamp: currentTime.toISOString(),
      session_id: sessionId,
      user_id: userId,
      event_name: eventName,
      variant,
      device,
      channel,
      value,
    });

    // Increment time by 10-120 seconds for next event
    currentTime = new Date(currentTime.getTime() + randomInt(10, 120) * 1000);
  };

  // Every session starts with page_view
  addEvent('page_view');

  // Some sessions have multiple page views (browsing)
  const extraPageViews = Math.random() < 0.4 ? randomInt(1, 3) : 0;
  for (let i = 0; i < extraPageViews; i++) {
    addEvent('page_view');
  }

  // 60% add to cart
  if (Math.random() < RATE_VIEW_TO_CART) {
    addEvent('add_to_cart');

    // 40% of cart sessions begin checkout
    if (Math.random() < RATE_CART_TO_CHECKOUT) {
      addEvent('begin_checkout');

      // 70% of checkout sessions complete purchase
      if (Math.random() < RATE_CHECKOUT_TO_PURCHASE) {
        const orderValue = randomInt(MIN_ORDER_VALUE, MAX_ORDER_VALUE);
        addEvent('purchase', orderValue);
      }
    }
  }

  return events;
}

function generateData(): Event[] {
  const allEvents: Event[] = [];
  const now = new Date();

  console.log('Generating analytics data...');
  console.log(`- ${NUM_USERS} users`);
  console.log(`- ${NUM_SESSIONS} sessions`);
  console.log(`- ${DAYS_OF_DATA} days of data`);
  console.log();

  for (let sessionIndex = 0; sessionIndex < NUM_SESSIONS; sessionIndex++) {
    // Assign session to a random user (some users will have multiple sessions)
    const userId = generateUserId(randomInt(0, NUM_USERS - 1));
    const sessionId = generateSessionId(sessionIndex);

    // Session-level attributes (consistent across all events in session)
    const variant = randomChoice(VARIANTS);
    const device = randomChoice(DEVICES, DEVICE_WEIGHTS);
    const channel = randomChoice(CHANNELS, CHANNEL_WEIGHTS);

    const baseTimestamp = generateTimestamp(now, sessionIndex);

    const sessionEvents = generateSessionEvents(
      sessionId,
      userId,
      variant,
      device,
      channel,
      baseTimestamp
    );

    allEvents.push(...sessionEvents);
  }

  // Sort by timestamp (events may be out of order due to random generation)
  allEvents.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return allEvents;
}

// Calculate and display statistics
function displayStats(events: Event[]) {
  const sessions = new Set(events.map(e => e.session_id));
  const users = new Set(events.map(e => e.user_id));

  const pageViewSessions = new Set(
    events.filter(e => e.event_name === 'page_view').map(e => e.session_id)
  );
  const cartSessions = new Set(
    events.filter(e => e.event_name === 'add_to_cart').map(e => e.session_id)
  );
  const checkoutSessions = new Set(
    events.filter(e => e.event_name === 'begin_checkout').map(e => e.session_id)
  );
  const purchaseSessions = new Set(
    events.filter(e => e.event_name === 'purchase').map(e => e.session_id)
  );

  const totalRevenue = events
    .filter(e => e.event_name === 'purchase')
    .reduce((sum, e) => sum + (e.value || 0), 0);

  console.log('Generated data statistics:');
  console.log('-------------------------');
  console.log(`Total events: ${events.length}`);
  console.log(`Total sessions: ${sessions.size}`);
  console.log(`Total users: ${users.size}`);
  console.log();
  console.log('Funnel:');
  console.log(`  page_view:      ${pageViewSessions.size} sessions (100%)`);
  console.log(
    `  add_to_cart:    ${cartSessions.size} sessions (${((cartSessions.size / pageViewSessions.size) * 100).toFixed(1)}%)`
  );
  console.log(
    `  begin_checkout: ${checkoutSessions.size} sessions (${((checkoutSessions.size / cartSessions.size) * 100).toFixed(1)}% of cart)`
  );
  console.log(
    `  purchase:       ${purchaseSessions.size} sessions (${((purchaseSessions.size / checkoutSessions.size) * 100).toFixed(1)}% of checkout)`
  );
  console.log();
  console.log(`Total revenue: $${(totalRevenue / 100).toFixed(2)}`);
  console.log(
    `Average order value: $${(totalRevenue / purchaseSessions.size / 100).toFixed(2)}`
  );
  console.log();
}

// Main execution
const events = generateData();
displayStats(events);

// Write to file
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const outputPath = path.join(dataDir, 'events.json');
fs.writeFileSync(outputPath, JSON.stringify(events, null, 2));

console.log(`Data written to: ${outputPath}`);
