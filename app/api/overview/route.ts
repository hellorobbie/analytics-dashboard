import { NextRequest, NextResponse } from 'next/server'
import { loadEvents } from '@/lib/db'
import { Device, Channel } from '@/lib/types'

/**
 * GET /api/overview
 *
 * Returns summary statistics with optional filters
 * Query params:
 * - startDate: ISO date (optional)
 * - endDate: ISO date (optional)
 * - device: mobile|desktop|tablet (optional)
 * - channel: organic|paid_search|social|email|direct (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const deviceFilter = searchParams.get('device')
    const channelFilter = searchParams.get('channel')

    let events = loadEvents()

    // Apply date filters
    if (startDate) {
      events = events.filter((e) => e.timestamp >= startDate)
    }
    if (endDate) {
      events = events.filter((e) => e.timestamp <= endDate)
    }

    // Apply device filter
    if (deviceFilter) {
      events = events.filter((e) => e.device === deviceFilter)
    }

    // Apply channel filter
    if (channelFilter) {
      events = events.filter((e) => e.channel === channelFilter)
    }

    // Calculate metrics
    const uniqueSessions = new Set(events.map((e) => e.session_id)).size
    const purchases = events.filter((e) => e.event_name === 'purchase')
    const purchaseCount = purchases.length
    const conversionRate =
      uniqueSessions > 0 ? (purchaseCount / uniqueSessions) * 100 : 0
    const totalRevenue = purchases.reduce((sum, e) => sum + (e.value || 0), 0)
    const aov = purchaseCount > 0 ? totalRevenue / purchaseCount : 0

    // Get date range from filtered events
    const timestamps = events.map((e) => e.timestamp).sort()
    const dateRange = {
      start: timestamps[0]?.split('T')[0] || null,
      end: timestamps[timestamps.length - 1]?.split('T')[0] || null,
    }

    // Determine if it's a single day or multiple days
    const isSingleDay = dateRange.start === dateRange.end

    // Calculate hourly breakdown
    let hourlyMetrics: Array<{
      hour: string
      hour_24: number
      day?: string
      sessions: number
      conversions: number
      revenue: number
      channels: Record<string, number>
    }> = []

    if (isSingleDay) {
      // Single day: aggregate by hour of day (0-23)
      const hourlyData: Record<
        number,
        {
          sessions: Set<string>
          purchases: number
          revenue: number
          channels: Record<string, number>
        }
      > = {}

      // Initialize 24 hours
      for (let h = 0; h < 24; h++) {
        hourlyData[h] = {
          sessions: new Set(),
          purchases: 0,
          revenue: 0,
          channels: {},
        }
      }

      // Aggregate events by hour
      events.forEach((event) => {
        const hour = new Date(event.timestamp).getHours()
        hourlyData[hour].sessions.add(event.session_id)
        if (event.channel) {
          hourlyData[hour].channels[event.channel] =
            (hourlyData[hour].channels[event.channel] || 0) + 1
        }
        if (event.event_name === 'purchase') {
          hourlyData[hour].purchases += 1
          hourlyData[hour].revenue += event.value || 0
        }
      })

      hourlyMetrics = Object.entries(hourlyData).map(([hour, data]) => ({
        hour: `${parseInt(hour).toString().padStart(2, '0')}:00`,
        hour_24: parseInt(hour),
        sessions: data.sessions.size,
        conversions: data.purchases,
        revenue: data.revenue / 100,
        channels: data.channels,
      }))
    } else {
      // Multiple days: aggregate by date + hour
      const dayHourlyData: Record<
        string,
        {
          sessions: Set<string>
          purchases: number
          revenue: number
          channels: Record<string, number>
        }
      > = {}

      events.forEach((event) => {
        const date = event.timestamp.split('T')[0]
        const hour = new Date(event.timestamp).getHours()
        const key = `${date}|${hour}`

        if (!dayHourlyData[key]) {
          dayHourlyData[key] = {
            sessions: new Set(),
            purchases: 0,
            revenue: 0,
            channels: {},
          }
        }

        dayHourlyData[key].sessions.add(event.session_id)
        if (event.channel) {
          dayHourlyData[key].channels[event.channel] =
            (dayHourlyData[key].channels[event.channel] || 0) + 1
        }
        if (event.event_name === 'purchase') {
          dayHourlyData[key].purchases += 1
          dayHourlyData[key].revenue += event.value || 0
        }
      })

      // Sort by date and hour
      hourlyMetrics = Object.entries(dayHourlyData)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, data]) => {
          const [date, hour] = key.split('|')
          const hourNum = parseInt(hour)
          const shortDate = date.substring(5) // MM-DD format
          return {
            hour: `${shortDate} ${hourNum.toString().padStart(2, '0')}:00`,
            hour_24: hourNum,
            day: date,
            sessions: data.sessions.size,
            conversions: data.purchases,
            revenue: data.revenue / 100,
            channels: data.channels,
          }
        })
    }

    return NextResponse.json({
      sessions: uniqueSessions,
      purchases: purchaseCount,
      conversion_rate: conversionRate,
      revenue: totalRevenue,
      aov,
      date_range: dateRange,
      hourly_metrics: hourlyMetrics,
      is_single_day: isSingleDay,
    })
  } catch (error) {
    console.error('Error calculating overview:', error)
    return NextResponse.json(
      { error: 'Failed to calculate overview' },
      { status: 500 },
    )
  }
}
