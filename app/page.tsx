'use client'

import { useEffect, useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface HourlyMetric {
  hour: string
  hour_24: number
  day?: string
  sessions: number
  conversions: number
  revenue: number
  channels: Record<string, number>
}

interface OverviewData {
  sessions: number
  purchases: number
  conversion_rate: number
  revenue: number
  aov: number
  date_range: {
    start: string | null
    end: string | null
  }
  hourly_metrics: HourlyMetric[]
  is_single_day: boolean
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [device, setDevice] = useState('')
  const [channel, setChannel] = useState('')

  // Get today's date in YYYY-MM-DD format to prevent future dates
  const today = new Date().toISOString().split('T')[0]

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (device) params.append('device', device)
      if (channel) params.append('channel', channel)

      const response = await fetch(`/api/overview?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch overview data')

      const result: OverviewData = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleFilterChange = () => {
    fetchData()
  }

  const handleReset = () => {
    setStartDate('')
    setEndDate('')
    setDevice('')
    setChannel('')
    setData(null)
    // Reset by calling fetch with no params
    ;(async () => {
      const response = await fetch(`/api/overview`)
      const result: OverviewData = await response.json()
      setData(result)
    })()
  }

  return (
    <div className='min-h-screen bg-slate-950'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <div className='mb-12'>
          <h1 className='text-4xl font-bold text-white mb-2'>Overview</h1>
          <p className='text-slate-400'>
            Track key metrics and performance indicators
          </p>
        </div>

        {/* Filters Section */}
        <div className='mb-8 bg-slate-900 rounded-lg border border-slate-800 p-6'>
          <h2 className='text-lg font-semibold text-white mb-4'>Filters</h2>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4'>
            {/* Start Date */}
            <div>
              <label className='block text-sm font-medium text-slate-300 mb-2'>
                Start Date
              </label>
              <input
                type='date'
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={today}
                className='w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>

            {/* End Date */}
            <div>
              <label className='block text-sm font-medium text-slate-300 mb-2'>
                End Date
              </label>
              <input
                type='date'
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                max={today}
                className='w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>

            {/* Device Filter */}
            <div>
              <label className='block text-sm font-medium text-slate-300 mb-2'>
                Device
              </label>
              <div className='relative'>
                <select
                  value={device}
                  onChange={(e) => setDevice(e.target.value)}
                  className='w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option value=''>All Devices</option>
                  <option value='mobile'>Mobile</option>
                  <option value='desktop'>Desktop</option>
                  <option value='tablet'>Tablet</option>
                </select>
                <ChevronDownIcon className='absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
              </div>
            </div>

            {/* Channel Filter */}
            <div>
              <label className='block text-sm font-medium text-slate-300 mb-2'>
                Channel
              </label>
              <div className='relative'>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className='w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option value=''>All Channels</option>
                  <option value='organic'>Organic</option>
                  <option value='paid_search'>Paid Search</option>
                  <option value='social'>Social</option>
                  <option value='email'>Email</option>
                  <option value='direct'>Direct</option>
                </select>
                <ChevronDownIcon className='absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none' />
              </div>
            </div>

            {/* Action Buttons */}
            <div className='flex gap-2 items-end'>
              <button
                onClick={handleFilterChange}
                className='flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colours'
              >
                Apply
              </button>
              <button
                onClick={handleReset}
                className='flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded transition-colours'
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        {loading ? (
          <div className='flex items-center justify-center h-64'>
            <div className='text-slate-400'>Loading metrics...</div>
          </div>
        ) : error ? (
          <div className='bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-200'>
            {error}
          </div>
        ) : data ? (
          <>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8'>
              {/* Sessions Card */}
              <div className='bg-slate-900 rounded-lg border border-slate-800 p-6 hover:border-slate-700 transition-colours'>
                <div className='text-slate-400 text-sm font-medium mb-2'>
                  Sessions
                </div>
                <div className='text-4xl font-bold text-white mb-1'>
                  {data.sessions.toLocaleString()}
                </div>
                <div className='text-xs text-slate-500'>
                  Total user sessions
                </div>
              </div>

              {/* Purchases Card */}
              <div className='bg-slate-900 rounded-lg border border-slate-800 p-6 hover:border-slate-700 transition-colours'>
                <div className='text-slate-400 text-sm font-medium mb-2'>
                  Purchases
                </div>
                <div className='text-4xl font-bold text-white mb-1'>
                  {data.purchases.toLocaleString()}
                </div>
                <div className='text-xs text-slate-500'>
                  Completed transactions
                </div>
              </div>

              {/* Conversion Rate Card */}
              <div className='bg-slate-900 rounded-lg border border-slate-800 p-6 hover:border-slate-700 transition-colours'>
                <div className='text-slate-400 text-sm font-medium mb-2'>
                  Conversion Rate
                </div>
                <div className='text-4xl font-bold text-white mb-1'>
                  {data.conversion_rate.toFixed(2)}%
                </div>
                <div className='text-xs text-slate-500'>
                  Sessions to purchase
                </div>
              </div>

              {/* Revenue Card */}
              <div className='bg-slate-900 rounded-lg border border-slate-800 p-6 hover:border-slate-700 transition-colours'>
                <div className='text-slate-400 text-sm font-medium mb-2'>
                  Revenue
                </div>
                <div className='text-4xl font-bold text-white mb-1'>
                  ${(data.revenue / 100).toFixed(2)}
                </div>
                <div className='text-xs text-slate-500'>Total revenue</div>
              </div>

              {/* AOV Card */}
              <div className='bg-slate-900 rounded-lg border border-slate-800 p-6 hover:border-slate-700 transition-colours'>
                <div className='text-slate-400 text-sm font-medium mb-2'>
                  Average Order Value
                </div>
                <div className='text-4xl font-bold text-white mb-1'>
                  ${(data.aov / 100).toFixed(2)}
                </div>
                <div className='text-xs text-slate-500'>Per order</div>
              </div>
            </div>

            {/* Date Range Info */}
            {data.date_range.start && data.date_range.end && (
              <div className='bg-slate-900 rounded-lg border border-slate-800 p-4 mb-8'>
                <p className='text-sm text-slate-400'>
                  <span className='font-medium'>Data range:</span>{' '}
                  {data.date_range.start} to {data.date_range.end}
                </p>
              </div>
            )}

            {/* Charts Section */}
            <div className='space-y-8'>
              {/* Traffic Header */}
              <div className='bg-slate-800 border-l-4 border-teal-500 px-6 py-4 rounded-sm'>
                <h2 className='text-lg font-semibold text-white tracking-wide'>
                  TRAFFIC OVERVIEW
                  {data.is_single_day && ' - BY HOUR'}
                  {!data.is_single_day && ' - BY HOUR (ALL DAYS)'}
                </h2>
              </div>

              {/* Sessions and Revenue Charts */}
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                {/* Sessions by Hour */}
                <div className='bg-slate-900 rounded-lg border border-slate-800 p-6'>
                  <h3 className='text-sm font-medium text-slate-400 mb-4'>
                    SESSIONS BY HOUR
                  </h3>
                  <ResponsiveContainer width='100%' height={300}>
                    <BarChart
                      data={data.hourly_metrics}
                      margin={{ bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray='3 3' stroke='#334155' />
                      <XAxis
                        dataKey='hour'
                        stroke='#94a3b8'
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor='end'
                        height={80}
                        interval={
                          data.is_single_day
                            ? 2
                            : Math.ceil(data.hourly_metrics.length / 10) - 1
                        }
                      />
                      <YAxis stroke='#94a3b8' tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #475569',
                          borderRadius: '6px',
                        }}
                        labelStyle={{ color: '#e2e8f0' }}
                      />
                      <Bar
                        dataKey='sessions'
                        fill='#14b8a6'
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Revenue by Hour */}
                <div className='bg-slate-900 rounded-lg border border-slate-800 p-6'>
                  <h3 className='text-sm font-medium text-slate-400 mb-4'>
                    REVENUE BY HOUR
                  </h3>
                  <ResponsiveContainer width='100%' height={300}>
                    <LineChart
                      data={data.hourly_metrics}
                      margin={{ bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray='3 3' stroke='#334155' />
                      <XAxis
                        dataKey='hour'
                        stroke='#94a3b8'
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor='end'
                        height={80}
                        interval={
                          data.is_single_day
                            ? 2
                            : Math.ceil(data.hourly_metrics.length / 10) - 1
                        }
                      />
                      <YAxis stroke='#94a3b8' tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #475569',
                          borderRadius: '6px',
                        }}
                        labelStyle={{ color: '#e2e8f0' }}
                        formatter={(value) =>
                          `$${(value as number).toFixed(2)}`
                        }
                      />
                      <Line
                        type='monotone'
                        dataKey='revenue'
                        stroke='#06b6d4'
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Conversions by Hour */}
              <div className='bg-slate-900 rounded-lg border border-slate-800 p-6'>
                <h3 className='text-sm font-medium text-slate-400 mb-4'>
                  CONVERSIONS BY HOUR
                </h3>
                <ResponsiveContainer width='100%' height={300}>
                  <BarChart data={data.hourly_metrics} margin={{ bottom: 60 }}>
                    <CartesianGrid strokeDasharray='3 3' stroke='#334155' />
                    <XAxis
                      dataKey='hour'
                      stroke='#94a3b8'
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor='end'
                      height={80}
                      interval={
                        data.is_single_day
                          ? 2
                          : Math.ceil(data.hourly_metrics.length / 10) - 1
                      }
                    />
                    <YAxis stroke='#94a3b8' tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                      }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar
                      dataKey='conversions'
                      fill='#10b981'
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
