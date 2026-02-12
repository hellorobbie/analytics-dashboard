'use client';

import { useState, useEffect } from 'react';
import { FunnelStep } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function FunnelPage() {
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFunnel();
  }, []);

  const fetchFunnel = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/funnel');
      if (!response.ok) {
        throw new Error('Failed to fetch funnel data');
      }

      const data: FunnelStep[] = await response.json();
      setFunnel(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading funnel data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">Error: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Funnel Analysis</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track user progression through conversion steps
        </p>
      </div>

      {/* Funnel Visualization */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6">Conversion Funnel</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={funnel}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="step_name" />
            <YAxis yAxisId="left" label={{ value: 'Sessions', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'Conversion %', angle: 90, position: 'insideRight' }} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="sessions" fill="#3b82f6" name="Sessions" />
            <Bar yAxisId="right" dataKey="pct_from_start" fill="#10b981" name="% from Start" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Funnel Steps Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Step
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Sessions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  % from Previous
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  % from Start
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {funnel.map((step, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {step.step_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {step.sessions.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                      {step.pct_from_previous.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                      {step.pct_from_start.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
            Overall Conversion Rate
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {funnel.length > 0 ? funnel[funnel.length - 1].pct_from_start.toFixed(1) : '0'}%
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            From page view to purchase
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
            Total Conversions
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {funnel.length > 0 ? funnel[funnel.length - 1].sessions.toLocaleString() : '0'}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Completed purchases
          </p>
        </div>
      </div>
    </div>
  );
}
