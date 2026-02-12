import { NextRequest, NextResponse } from 'next/server';
import { loadEvents } from '@/lib/db';

/**
 * GET /api/events
 *
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 50, max 200)
 * - session_id: string (optional filter)
 *
 * Returns paginated events, sorted by timestamp descending (newest first)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(
    parseInt(searchParams.get('limit') || '50', 10),
    200
  );
  const sessionIdFilter = searchParams.get('session_id');

  try {
    let events = loadEvents();

    // Filter by session_id if provided
    if (sessionIdFilter) {
      events = events.filter(e => e.session_id === sessionIdFilter);
    }

    // Sort by timestamp descending (newest first)
    const sortedEvents = [...events].sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp)
    );

    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEvents = sortedEvents.slice(startIndex, endIndex);

    return NextResponse.json({
      data: paginatedEvents,
      pagination: {
        page,
        limit,
        total: events.length,
        totalPages: Math.ceil(events.length / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
