'use client';

import { useState, useEffect } from 'react';
import { ABTestResult } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

type ExperimentData = {
  experiment_id: string;
  experiment_name: string;
  results: ABTestResult[];
};

export default function ABTestPage() {
  const [experiments, setExperiments] = useState<ExperimentData[]>([]);
  const [expandedExperiment, setExpandedExperiment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchABTestResults();
  }, []);

  const fetchABTestResults = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ab-test');
      if (!response.ok) {
        throw new Error('Failed to fetch A/B test results');
      }

      const data: ExperimentData[] = await response.json();
      setExperiments(data);
      // Expand first experiment by default
      if (data.length > 0) {
        setExpandedExperiment(data[0].experiment_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const calculateLift = (results: ABTestResult[]) => {
    if (results.length < 2) return 0;
    const [variantA, variantB] = results;
    return (
      ((variantB.conversion_rate - variantA.conversion_rate) /
        variantA.conversion_rate) *
      100
    );
  };

  const getWinner = (results: ABTestResult[]) => {
    if (results.length < 2) return null;
    const [variantA, variantB] = results;
    if (variantA.conversion_rate > variantB.conversion_rate) return 'A';
    if (variantB.conversion_rate > variantA.conversion_rate) return 'B';
    return null;
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading A/B test results...</div>
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
        <h1 className="text-3xl font-bold mb-2">A/B Testing</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {experiments.length} experiment{experiments.length !== 1 ? 's' : ''} · Click to expand and view detailed metrics
        </p>
      </div>

      {/* Experiments List */}
      <div className="space-y-4">
        {experiments.map((experiment) => {
          const isExpanded = expandedExperiment === experiment.experiment_id;
          const winner = getWinner(experiment.results);
          const lift = calculateLift(experiment.results);

          return (
            <div
              key={experiment.experiment_id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              {/* Header - Click to expand */}
              <button
                onClick={() =>
                  setExpandedExperiment(
                    isExpanded ? null : experiment.experiment_id
                  )
                }
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 text-left">
                  <ChevronDownIcon
                    className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                      {experiment.experiment_name}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      ID: {experiment.experiment_id}
                    </p>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="flex items-center gap-6 text-right">
                  {winner && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Winner: Variant {winner}
                      </p>
                      <p className={`font-semibold ${lift > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        {lift.toFixed(1)}% lift
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Conversion
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {Math.max(...experiment.results.map(r => r.conversion_rate)).toFixed(2)}%
                    </p>
                  </div>
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-6 space-y-6">
                  {/* Winner Badge */}
                  {winner && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-green-800 dark:text-green-200">
                        <span className="font-semibold">Variant {winner} is winning</span>
                        {' '}with {lift.toFixed(1)}% lift in conversion rate
                      </p>
                    </div>
                  )}

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Conversion Rate Chart */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Conversion Rate
                      </h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart
                          data={experiment.results.map(r => ({
                            variant: `Variant ${r.variant}`,
                            rate: r.conversion_rate,
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="variant" />
                          <YAxis label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                          <Tooltip formatter={(value) => `${(value as number).toFixed(2)}%`} />
                          <Bar dataKey="rate" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Revenue per Session Chart */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Revenue per Session
                      </h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart
                          data={experiment.results.map(r => ({
                            variant: `Variant ${r.variant}`,
                            revenue: r.revenue_per_session,
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="variant" />
                          <YAxis label={{ value: '$', angle: -90, position: 'insideLeft' }} />
                          <Tooltip formatter={(value) => `$${((value as number) / 100).toFixed(2)}`} />
                          <Bar dataKey="revenue" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Detailed Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                            Variant
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                            Sessions
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                            Conversions
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                            Conv. Rate
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                            Total Revenue
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                            Rev/Session
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {experiment.results.map((result, idx) => (
                          <tr
                            key={idx}
                            className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                              winner === result.variant ? 'bg-green-50 dark:bg-green-900/10' : ''
                            }`}
                          >
                            <td className="px-4 py-2 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                                Variant {result.variant}
                                {winner === result.variant && ' 🏆'}
                              </span>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">
                              {result.sessions.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">
                              {result.conversions.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                                {result.conversion_rate.toFixed(2)}%
                              </span>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">
                              {formatCurrency(result.revenue)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">
                              {formatCurrency(result.revenue_per_session)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {experiments.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">No experiments found</p>
        </div>
      )}
    </div>
  );
}
