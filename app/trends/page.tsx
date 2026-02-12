'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type TrendData = {
  date: string
  conversions: number
  revenue: number
  sessions: number
  conversion_rate: number
}

export default function TrendsPage() {
  const [trends, setTrends] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTrends()
  }, [])

  const fetchTrends = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/trends')
      if (!response.ok) {
        throw new Error('Failed to fetch trends')
      }

      const data: TrendData[] = await response.json()
      setTrends(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const calculateStats = () => {
    if (trends.length === 0) {
      return {
        totalConversions: 0,
        totalRevenue: 0,
        avgConversionRate: 0,
        totalSessions: 0,
      }
    }

    const totalConversions = trends.reduce((sum, t) => sum + t.conversions, 0)
    const totalRevenue = trends.reduce((sum, t) => sum + t.revenue, 0)
    const totalSessions = trends.reduce((sum, t) => sum + t.sessions, 0)
    const avgConversionRate =
      trends.reduce((sum, t) => sum + t.conversion_rate, 0) / trends.length

    return { totalConversions, totalRevenue, avgConversionRate, totalSessions }
  }

  if (loading) {
    return (
      <div className='flex justify-center items-center h-64'>
        <div className='text-gray-500'>Loading trends...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4'>
        <p className='text-red-800 dark:text-red-200'>Error: {error}</p>
      </div>
    )
  }

  const stats = calculateStats()

  return (
    <div>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold mb-2'>Trends</h1>
        <p className='text-gray-600 dark:text-gray-400'>
          View metrics over time across all experiments
        </p>
      </div>

      {/* Summary Stats */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-8'>
        <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6'>
          <h3 className='text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2'>
            Total Conversions
          </h3>
          <p className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
            {stats.totalConversions.toLocaleString()}
          </p>
        </div>

        <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6'>
          <h3 className='text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2'>
            Total Revenue
          </h3>
          <p className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
            {formatCurrency(stats.totalRevenue)}
          </p>
        </div>

        <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6'>
          <h3 className='text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2'>
            Total Sessions
          </h3>
          <p className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
            {stats.totalSessions.toLocaleString()}
          </p>
        </div>

        <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6'>
          <h3 className='text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2'>
            Avg Conversion Rate
          </h3>
          <p className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
            {stats.avgConversionRate.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Conversions Trend */}
      <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-8'>
        <h2 className='text-lg font-semibold mb-4'>Daily Conversions</h2>
        <ResponsiveContainer width='100%' height={350}>
          <LineChart
            data={trends}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='date'
              tick={{ fontSize: 12 }}
              interval={Math.floor(trends.length / 7) || 0}
            />
            <YAxis
              label={{
                value: 'Conversions',
                angle: -90,
                position: 'insideLeft',
              }}
            />
            <Tooltip />
            <Legend />
            <Line
              type='monotone'
              dataKey='conversions'
              stroke='#3b82f6'
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue Trend */}
      <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-8'>
        <h2 className='text-lg font-semibold mb-4'>Daily Revenue</h2>
        <ResponsiveContainer width='100%' height={350}>
          <LineChart
            data={trends.map((t) => ({ ...t, revenue: t.revenue / 100 }))}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='date'
              tick={{ fontSize: 12 }}
              interval={Math.floor(trends.length / 7) || 0}
            />
            <YAxis
              label={{
                value: 'Revenue ($)',
                angle: -90,
                position: 'insideLeft',
              }}
            />
            <Tooltip
              formatter={(value) => `$${(value as number).toFixed(2)}`}
            />
            <Legend />
            <Line
              type='monotone'
              dataKey='revenue'
              stroke='#10b981'
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Conversion Rate Trend */}
      <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-8'>
        <h2 className='text-lg font-semibold mb-4'>Daily Conversion Rate</h2>
        <ResponsiveContainer width='100%' height={350}>
          <LineChart
            data={trends}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='date'
              tick={{ fontSize: 12 }}
              interval={Math.floor(trends.length / 7) || 0}
            />
            <YAxis
              label={{ value: 'Rate (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value) => `${(value as number).toFixed(2)}%`}
            />
            <Legend />
            <Line
              type='monotone'
              dataKey='conversion_rate'
              stroke='#f59e0b'
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Details Table */}
      <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
            <thead className='bg-gray-50 dark:bg-gray-900'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider'>
                  Date
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider'>
                  Sessions
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider'>
                  Conversions
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider'>
                  Conv. Rate
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider'>
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
              {trends.map((trend, index) => (
                <tr
                  key={index}
                  className='hover:bg-gray-50 dark:hover:bg-gray-700/50'
                >
                  <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100'>
                    {trend.date}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400'>
                    {trend.sessions.toLocaleString()}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400'>
                    {trend.conversions.toLocaleString()}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm'>
                    <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'>
                      {trend.conversion_rate.toFixed(2)}%
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400'>
                    {formatCurrency(trend.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
