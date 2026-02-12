import { NextResponse } from 'next/server'
import { loadEvents } from '@/lib/db'

export type TrendData = {
  date: string
  conversions: number
  revenue: number
  sessions: number
  conversion_rate: number
}

/**
 * GET /api/trends
 *
 * Returns daily trends data showing conversions, revenue, and sessions over time
 */
export async function GET() {
  try {
    const events = loadEvents()

    // Group events by date
    const trendsByDate = new Map<
      string,
      {
        sessions: Set<string>
        conversions: number
        revenue: number
      }
    >()

    events.forEach((event) => {
      // Extract date from ISO timestamp (YYYY-MM-DD)
      const date = event.timestamp.split('T')[0]

      if (!trendsByDate.has(date)) {
        trendsByDate.set(date, {
          sessions: new Set(),
          conversions: 0,
          revenue: 0,
        })
      }

      const dayData = trendsByDate.get(date)!
      dayData.sessions.add(event.session_id)

      if (event.event_name === 'purchase') {
        dayData.conversions++
        if (event.value) {
          dayData.revenue += event.value
        }
      }
    })

    // Convert to sorted array and calculate rates
    const trends: TrendData[] = Array.from(trendsByDate.entries())
      .map(([date, data]) => ({
        date,
        sessions: data.sessions.size,
        conversions: data.conversions,
        revenue: data.revenue,
        conversion_rate: (data.conversions / data.sessions.size) * 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json(trends)
  } catch (error) {
    console.error('Error calculating trends:', error)
    return NextResponse.json(
      { error: 'Failed to calculate trends' },
      { status: 500 },
    )
  }
}
