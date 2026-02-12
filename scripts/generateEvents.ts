import { Event, EventName, Variant, Device, Channel } from '../lib/types'
import fs from 'fs'
import path from 'path'

/**
 * Generate realistic mock analytics data
 *
 * Strategy:
 * - Fetches LIVE experiments from the experiment manager (falls back to hardcoded list)
 * - Each experiment has its own 500 users, 2000 sessions
 * - 7-day date range per experiment
 * - Realistic funnel drop-offs with slight variations per experiment
 * - Each session belongs to one user, variant, device, channel, experiment
 */

const EXPERIMENT_MANAGER_URL = process.env.EXPERIMENT_MANAGER_URL
const EXPERIMENT_MANAGER_API_KEY = process.env.EXPERIMENT_MANAGER_API_KEY

// Type for what comes back from the experiment manager API
interface RemoteExperiment {
  id: string
  name: string
  status: string
  hypothesis: string | null
  primaryKPI: string | null
  targeting: {
    device?: string[]
    country?: string[]
    channel?: string[]
    userType?: string[]
    language?: string[]
  }
  variants: Array<{
    id: string
    name: string
    trafficPercentage: number
    isControl: boolean
  }>
  goLiveAt: string | null
}

// Internal format used by the generator
interface GeneratorExperiment {
  id: string
  name: string
  variantBModifier?: number
  deviceWeights?: number[]
  channelWeights?: number[]
}

const FALLBACK_EXPERIMENTS: GeneratorExperiment[] = [
  { id: 'exp_001', name: 'Homepage Hero Text' },
  { id: 'exp_002', name: 'CTA Button Colour', variantBModifier: -0.15 },
  { id: 'exp_003', name: 'Checkout Flow', variantBModifier: 0.25 },
  { id: 'exp_004', name: 'Product Image Size' },
  { id: 'exp_005', name: 'Discount Badge Position', variantBModifier: 0.1 },
  { id: 'exp_006', name: 'Mobile Navigation', variantBModifier: 0.05 },
  { id: 'exp_007', name: 'Email Follow-up Copy', variantBModifier: 0.08 },
  { id: 'exp_008', name: 'Order Confirmation Page', variantBModifier: 0.2 },
]

const NUM_USERS = 500
const NUM_SESSIONS = 2000
const DAYS_OF_DATA = 7

// Conversion rates
const RATE_VIEW_TO_CART = 0.6
const RATE_CART_TO_CHECKOUT = 0.4
const RATE_CHECKOUT_TO_PURCHASE = 0.7

// Distribution weights
const VARIANTS: Variant[] = ['A', 'B']
const DEVICES: Device[] = ['mobile', 'desktop', 'tablet']
const DEVICE_WEIGHTS = [0.6, 0.35, 0.05] // Mobile-heavy, realistic for 2026

const CHANNELS: Channel[] = [
  'organic',
  'paid_search',
  'social',
  'email',
  'direct',
]
const CHANNEL_WEIGHTS = [0.3, 0.25, 0.2, 0.15, 0.1]

// Revenue distribution (in cents)
const MIN_ORDER_VALUE = 2000 // $20
const MAX_ORDER_VALUE = 30000 // $300

// --- Experiment Manager Integration ---

/**
 * Derive a variantBModifier from the experiment name using a simple hash.
 * Deterministic: same name always produces the same modifier.
 * Range: [-0.20, +0.30] with slight positive bias.
 */
function deriveVariantBModifier(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  const normalized = (Math.abs(hash) % 1000) / 1000
  return -0.20 + (normalized * 0.50)
}

/**
 * Derive device weights from targeting rules.
 * Non-targeted devices get 0 weight; remaining weights are renormalized.
 */
function deriveDeviceWeights(targetDevices?: string[]): number[] {
  const defaults = [0.6, 0.35, 0.05] // [mobile, desktop, tablet]

  if (!targetDevices || targetDevices.length === 0) {
    return defaults
  }

  const normalizedDevices = new Set<string>()
  for (const d of targetDevices) {
    const lower = d.toLowerCase()
    if (lower === 'ios' || lower === 'android' || lower === 'mobile') {
      normalizedDevices.add('mobile')
    } else if (lower === 'desktop') {
      normalizedDevices.add('desktop')
    } else if (lower === 'tablet') {
      normalizedDevices.add('tablet')
    }
  }

  if (normalizedDevices.size === 3) return defaults

  const dashboardDevices = ['mobile', 'desktop', 'tablet']
  const weights = dashboardDevices.map((device, i) =>
    normalizedDevices.has(device) ? defaults[i] : 0
  )

  const total = weights.reduce((sum, w) => sum + w, 0)
  if (total === 0) return defaults
  return weights.map(w => w / total)
}

/**
 * Derive channel weights from targeting rules.
 * Maps experiment manager channel names to dashboard channels.
 */
function deriveChannelWeights(targetChannels?: string[]): number[] {
  const defaults = [0.3, 0.25, 0.2, 0.15, 0.1] // [organic, paid_search, social, email, direct]

  if (!targetChannels || targetChannels.length === 0) {
    return defaults
  }

  const channelMap: Record<string, number[]> = {
    'web':         [0, 1, 4],
    'organic':     [0],
    'paid':        [1],
    'paid_search': [1],
    'social':      [2],
    'email':       [3],
    'direct':      [4],
    'app':         [4],
  }

  const activeIndices = new Set<number>()
  for (const ch of targetChannels) {
    const indices = channelMap[ch.toLowerCase()]
    if (indices) {
      indices.forEach(i => activeIndices.add(i))
    }
  }

  if (activeIndices.size === 0 || activeIndices.size === 5) return defaults

  const weights = defaults.map((w, i) => activeIndices.has(i) ? w : 0)
  const total = weights.reduce((sum, w) => sum + w, 0)
  if (total === 0) return defaults
  return weights.map(w => w / total)
}

function mapRemoteExperiment(remote: RemoteExperiment): GeneratorExperiment {
  return {
    id: `exp_${remote.id.substring(0, 8)}`,
    name: remote.name,
    variantBModifier: deriveVariantBModifier(remote.name),
    deviceWeights: deriveDeviceWeights(remote.targeting.device),
    channelWeights: deriveChannelWeights(remote.targeting.channel),
  }
}

async function fetchLiveExperiments(): Promise<GeneratorExperiment[]> {
  if (!EXPERIMENT_MANAGER_URL || !EXPERIMENT_MANAGER_API_KEY) {
    console.log('No EXPERIMENT_MANAGER_URL or API key configured, using fallback experiments')
    return FALLBACK_EXPERIMENTS
  }

  try {
    const url = `${EXPERIMENT_MANAGER_URL}/api/integrations/experiments`
    console.log(`Fetching live experiments from: ${url}`)

    const response = await fetch(url, {
      headers: { 'x-api-key': EXPERIMENT_MANAGER_API_KEY },
    })

    if (!response.ok) {
      console.error(`Failed to fetch experiments: ${response.status} ${response.statusText}`)
      return FALLBACK_EXPERIMENTS
    }

    const data = await response.json()
    const remoteExperiments: RemoteExperiment[] = data.experiments

    if (!remoteExperiments || remoteExperiments.length === 0) {
      console.log('No live experiments found, using fallback experiments')
      return FALLBACK_EXPERIMENTS
    }

    console.log(`Found ${remoteExperiments.length} live experiment(s) from experiment manager`)
    return remoteExperiments.map(mapRemoteExperiment)
  } catch (error) {
    console.error('Error fetching experiments:', error)
    console.log('Falling back to hardcoded experiments')
    return FALLBACK_EXPERIMENTS
  }
}

// --- Utility Functions ---

function randomChoice<T>(items: T[], weights?: number[]): T {
  if (!weights) {
    return items[Math.floor(Math.random() * items.length)]
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  let random = Math.random() * totalWeight

  for (let i = 0; i < items.length; i++) {
    random -= weights[i]
    if (random <= 0) {
      return items[i]
    }
  }

  return items[items.length - 1]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateUserId(index: number): string {
  return `user_${String(index).padStart(5, '0')}`
}

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function generateTimestamp(baseDate: Date, sessionIndex: number): Date {
  // Spread sessions across the date range
  const dayOffset = Math.floor((sessionIndex / NUM_SESSIONS) * DAYS_OF_DATA)
  const hourOffset = randomInt(8, 22) // Business hours + evening
  const minuteOffset = randomInt(0, 59)
  const secondOffset = randomInt(0, 59)

  const timestamp = new Date(baseDate)
  timestamp.setDate(timestamp.getDate() - (DAYS_OF_DATA - dayOffset - 1))
  timestamp.setHours(hourOffset, minuteOffset, secondOffset, 0)

  return timestamp
}

function generateSessionEvents(
  sessionId: string,
  userId: string,
  variant: Variant,
  device: Device,
  channel: Channel,
  experimentId: string,
  experimentName: string,
  variantBModifier: number | undefined,
  baseTimestamp: Date,
): Event[] {
  const events: Event[] = []
  let currentTime = new Date(baseTimestamp)

  // Apply variant B modifier to conversion rates if provided
  const viewToCartRate =
    variant === 'B' && variantBModifier
      ? Math.max(0, Math.min(1, RATE_VIEW_TO_CART * (1 + variantBModifier)))
      : RATE_VIEW_TO_CART
  const cartToCheckoutRate =
    variant === 'B' && variantBModifier
      ? Math.max(0, Math.min(1, RATE_CART_TO_CHECKOUT * (1 + variantBModifier)))
      : RATE_CART_TO_CHECKOUT
  const checkoutToPurchaseRate =
    variant === 'B' && variantBModifier
      ? Math.max(
          0,
          Math.min(1, RATE_CHECKOUT_TO_PURCHASE * (1 + variantBModifier)),
        )
      : RATE_CHECKOUT_TO_PURCHASE

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
      experiment_id: experimentId,
      experiment_name: experimentName,
      value,
    })

    // Increment time by 10-120 seconds for next event
    currentTime = new Date(currentTime.getTime() + randomInt(10, 120) * 1000)
  }

  // Every session starts with page_view
  addEvent('page_view')

  // Some sessions have multiple page views (browsing)
  const extraPageViews = Math.random() < 0.4 ? randomInt(1, 3) : 0
  for (let i = 0; i < extraPageViews; i++) {
    addEvent('page_view')
  }

  // Add to cart based on modified rate
  if (Math.random() < viewToCartRate) {
    addEvent('add_to_cart')

    // Begin checkout based on modified rate
    if (Math.random() < cartToCheckoutRate) {
      addEvent('begin_checkout')

      // Complete purchase based on modified rate
      if (Math.random() < checkoutToPurchaseRate) {
        const orderValue = randomInt(MIN_ORDER_VALUE, MAX_ORDER_VALUE)
        addEvent('purchase', orderValue)
      }
    }
  }

  return events
}

// --- Main Generation ---

async function generateData(): Promise<Event[]> {
  const experiments = await fetchLiveExperiments()
  const allEvents: Event[] = []
  const now = new Date()

  console.log('Generating analytics data...')
  console.log(`- ${experiments.length} experiments`)
  console.log(`- ${NUM_USERS} users per experiment`)
  console.log(`- ${NUM_SESSIONS} sessions per experiment`)
  console.log(`- ${DAYS_OF_DATA} days of data per experiment`)
  console.log()

  for (const experiment of experiments) {
    for (let sessionIndex = 0; sessionIndex < NUM_SESSIONS; sessionIndex++) {
      const userId = generateUserId(randomInt(0, NUM_USERS - 1))
      const sessionId = `${experiment.id}_session_${String(sessionIndex).padStart(6, '0')}`

      const variant = randomChoice(VARIANTS)
      const device = randomChoice(DEVICES, experiment.deviceWeights || DEVICE_WEIGHTS)
      const channel = randomChoice(CHANNELS, experiment.channelWeights || CHANNEL_WEIGHTS)

      const baseTimestamp = generateTimestamp(now, sessionIndex)

      const sessionEvents = generateSessionEvents(
        sessionId,
        userId,
        variant,
        device,
        channel,
        experiment.id,
        experiment.name,
        experiment.variantBModifier,
        baseTimestamp,
      )

      allEvents.push(...sessionEvents)
    }
  }

  allEvents.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  return allEvents
}

function displayStats(events: Event[]) {
  const sessions = new Set(events.map((e) => e.session_id))
  const users = new Set(events.map((e) => e.user_id))

  console.log('Generated data statistics:')
  console.log('=========================')
  console.log(`Total events: ${events.length}`)
  console.log(`Total sessions: ${sessions.size}`)
  console.log(`Total users: ${users.size}`)
  console.log()

  const eventsByExperiment = new Map<string, Event[]>()
  events.forEach((e) => {
    if (!eventsByExperiment.has(e.experiment_id)) {
      eventsByExperiment.set(e.experiment_id, [])
    }
    eventsByExperiment.get(e.experiment_id)!.push(e)
  })

  eventsByExperiment.forEach((expEvents, expId) => {
    const expName = expEvents[0]?.experiment_name || expId

    const pageViewSessions = new Set(
      expEvents
        .filter((e) => e.event_name === 'page_view')
        .map((e) => e.session_id),
    )
    const cartSessions = new Set(
      expEvents
        .filter((e) => e.event_name === 'add_to_cart')
        .map((e) => e.session_id),
    )
    const checkoutSessions = new Set(
      expEvents
        .filter((e) => e.event_name === 'begin_checkout')
        .map((e) => e.session_id),
    )
    const purchaseSessions = new Set(
      expEvents
        .filter((e) => e.event_name === 'purchase')
        .map((e) => e.session_id),
    )

    const totalRevenue = expEvents
      .filter((e) => e.event_name === 'purchase')
      .reduce((sum, e) => sum + (e.value || 0), 0)

    console.log(`Experiment: ${expName}`)
    console.log('-'.repeat(50))
    console.log(`Events: ${expEvents.length}`)
    console.log(`Sessions: ${pageViewSessions.size}`)
    console.log('Funnel:')
    console.log(`  page_view:      ${pageViewSessions.size} sessions (100%)`)
    console.log(
      `  add_to_cart:    ${cartSessions.size} sessions (${((cartSessions.size / pageViewSessions.size) * 100).toFixed(1)}%)`,
    )
    console.log(
      `  begin_checkout: ${checkoutSessions.size} sessions (${((checkoutSessions.size / cartSessions.size) * 100).toFixed(1)}% of cart)`,
    )
    console.log(
      `  purchase:       ${purchaseSessions.size} sessions (${((purchaseSessions.size / checkoutSessions.size) * 100).toFixed(1)}% of checkout)`,
    )
    console.log(`Total revenue: $${(totalRevenue / 100).toFixed(2)}`)
    console.log(
      `Average order value: $${(totalRevenue / purchaseSessions.size / 100).toFixed(2)}`,
    )
    console.log()
  })
}

// Main execution
async function main() {
  const events = await generateData()
  displayStats(events)

  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const outputPath = path.join(dataDir, 'events.json')
  fs.writeFileSync(outputPath, JSON.stringify(events, null, 2))

  console.log(`Data written to: ${outputPath}`)
}

main().catch((error) => {
  console.error('Fatal error during data generation:', error)
  process.exit(1)
})
