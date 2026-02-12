export default function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <a
          href="/events"
          className="block p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Events</h2>
          <p className="text-gray-600 dark:text-gray-400">
            View raw event data and debug sessions
          </p>
        </a>

        <a
          href="/funnel"
          className="block p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Funnel Analysis</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Track user progression and drop-off rates
          </p>
        </a>

        <a
          href="/ab-test"
          className="block p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">A/B Testing</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Compare variant performance and lift
          </p>
        </a>

        <a
          href="/trends"
          className="block p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Trends</h2>
          <p className="text-gray-600 dark:text-gray-400">
            View metrics over time
          </p>
        </a>
      </div>
    </div>
  );
}
