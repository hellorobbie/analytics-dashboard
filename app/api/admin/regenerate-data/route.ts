import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import path from 'path'
import { clearCache } from '@/lib/db'

/**
 * POST /api/admin/regenerate-data
 *
 * Regenerates the events data. Called by Heroku Scheduler daily.
 * Returns success/failure status.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify request is from Heroku (basic auth or IP check)
    const authHeader = request.headers.get('authorization')
    const schedulerToken = process.env.SCHEDULER_TOKEN

    if (schedulerToken && authHeader !== `Bearer ${schedulerToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting data regeneration...')

    // Run the data generation script
    const scriptPath = path.join(process.cwd(), 'scripts', 'generateEvents.ts')
    execSync(`npx tsx ${scriptPath}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    })

    // Clear the in-memory cache so subsequent API requests use the new data
    clearCache()

    console.log('Data regeneration completed successfully')

    return NextResponse.json({
      success: true,
      message: 'Data regenerated successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error regenerating data:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
