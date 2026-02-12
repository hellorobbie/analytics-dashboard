import { NextResponse } from 'next/server';
import { loadEvents } from '@/lib/db';
import { ABTestResult } from '@/lib/types';

/**
 * GET /api/ab-test
 *
 * Returns A/B test results for all experiments
 * Groups results by experiment_id
 */
export async function GET() {
  try {
    const events = loadEvents();

    // Group events by experiment_id
    const experimentMap = new Map<string, { name: string; events: typeof events }>();

    events.forEach(event => {
      if (!experimentMap.has(event.experiment_id)) {
        experimentMap.set(event.experiment_id, {
          name: event.experiment_name,
          events: [],
        });
      }
      experimentMap.get(event.experiment_id)!.events.push(event);
    });

    // Calculate metrics for each experiment
    const results = Array.from(experimentMap.entries()).map(([experimentId, { name, events }]) => {
      // Separate events by variant
      const variantEvents = {
        A: events.filter(e => e.variant === 'A'),
        B: events.filter(e => e.variant === 'B'),
      };

      const variantResults: ABTestResult[] = [];

      (['A', 'B'] as const).forEach(variant => {
        const variantData = variantEvents[variant];

        // Unique sessions per variant
        const sessions = new Set(variantData.map(e => e.session_id)).size;

        // Conversions (purchase events)
        const conversions = variantData.filter(
          e => e.event_name === 'purchase'
        ).length;

        // Conversion rate
        const conversionRate = sessions > 0 ? (conversions / sessions) * 100 : 0;

        // Total revenue (in cents)
        const revenue = variantData
          .filter(e => e.event_name === 'purchase' && e.value)
          .reduce((sum, e) => sum + (e.value || 0), 0);

        // Revenue per session
        const revenuePerSession = sessions > 0 ? revenue / sessions : 0;

        variantResults.push({
          variant,
          sessions,
          conversions,
          conversion_rate: conversionRate,
          revenue,
          revenue_per_session: revenuePerSession,
        });
      });

      return {
        experiment_id: experimentId,
        experiment_name: name,
        results: variantResults,
      };
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error calculating A/B test results:', error);
    return NextResponse.json(
      { error: 'Failed to calculate A/B test results' },
      { status: 500 }
    );
  }
}
