import { NextResponse } from 'next/server'
import { loadEvents } from '@/lib/db'
import { FunnelStep } from '@/lib/types'

const FUNNEL_STEPS = ['page_view', 'add_to_cart', 'begin_checkout', 'purchase']

/**
 * GET /api/funnel
 *
 * Returns funnel metrics showing user progression through conversion steps
 * Calculated as: page_view → add_to_cart → begin_checkout → purchase
 */
export async function GET() {
  try {
    const events = loadEvents()

    // Get unique sessions for each funnel step
    const stepSessions: { [key: string]: Set<string> } = {}

    FUNNEL_STEPS.forEach((step) => {
      stepSessions[step] = new Set(
        events.filter((e) => e.event_name === step).map((e) => e.session_id),
      )
    })

    // Build funnel with drop-off percentages
    const funnel: FunnelStep[] = []
    let previousCount = 0
    const firstStepCount = stepSessions[FUNNEL_STEPS[0]].size

    FUNNEL_STEPS.forEach((step, index) => {
      const currentCount = stepSessions[step].size
      const pctFromStart =
        firstStepCount > 0 ? (currentCount / firstStepCount) * 100 : 0
      const pctFromPrevious =
        previousCount > 0 ? (currentCount / previousCount) * 100 : 100

      funnel.push({
        step_name: step.replace('_', ' '),
        sessions: currentCount,
        pct_from_previous: pctFromPrevious,
        pct_from_start: pctFromStart,
      })

      previousCount = currentCount
    })

    return NextResponse.json(funnel)
  } catch (error) {
    console.error('Error calculating funnel:', error)
    return NextResponse.json(
      { error: 'Failed to calculate funnel' },
      { status: 500 },
    )
  }
}
