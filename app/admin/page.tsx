import { listAllResults } from '@/lib/storage/results';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  let results = [];
  let error = null;

  try {
    results = await listAllResults();
  } catch (err: any) {
    error = err.message;
  }

  const handleExportCSV = () => {
    // This will be handled client-side
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          🔧 Admin Dashboard
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300">
          View and export all analysis results
        </p>
      </div>

      {error && (
        <div className="card bg-red-50 dark:bg-red-900/20 mb-8">
          <p className="text-red-700 dark:text-red-300">
            ⚠️ Error loading results: {error}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="card text-center">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
            Total Analyses
          </h3>
          <p className="text-4xl font-bold text-pink-600 dark:text-pink-400">
            {results.length}
          </p>
        </div>

        <div className="card text-center">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
            Avg Features Detected
          </h3>
          <p className="text-4xl font-bold text-pink-600 dark:text-pink-400">
            {results.length > 0
              ? Math.round(
                  results.reduce((sum, r) => sum + (r.metadata?.detectionCount || 0), 0) /
                    results.length
                )
              : 0}
          </p>
        </div>

        <div className="card text-center">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
            Avg Processing Time
          </h3>
          <p className="text-4xl font-bold text-pink-600 dark:text-pink-400">
            {results.length > 0
              ? (
                  results.reduce((sum, r) => sum + (r.metadata?.processingTimeMs || 0), 0) /
                  results.length /
                  1000
                ).toFixed(1)
              : 0}
            s
          </p>
        </div>
      </div>

      {/* Export Actions */}
      <div className="card mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Export Data
        </h2>
        <div className="flex space-x-4">
          <ExportButton results={results} format="csv" />
          <ExportButton results={results} format="json" />
        </div>
      </div>

      {/* Results Table */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          All Results ({results.length})
        </h2>

        {results.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>No results yet. Start by analyzing your first drawing!</p>
            <Link href="/draw" className="btn-primary mt-4 inline-block">
              Get Started
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                    Traits Found
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                    Processing Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {results.map((result) => (
                  <tr key={result.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {new Date(result.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">
                      {result.id.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {result.traits.length} traits
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {result.metadata?.processingTimeMs
                        ? `${(result.metadata.processingTimeMs / 1000).toFixed(1)}s`
                        : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/results/${result.id}`}
                        className="text-pink-600 hover:text-pink-700 text-sm font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Client component for export functionality
function ExportButton({ results, format }: { results: any[]; format: 'csv' | 'json' }) {
  'use client';

  const handleExport = () => {
    if (format === 'json') {
      const dataStr = JSON.stringify({ results, exportedAt: new Date().toISOString() }, null, 2);
      downloadFile(dataStr, 'pig-results.json', 'application/json');
    } else if (format === 'csv') {
      const csv = convertToCSV(results);
      downloadFile(csv, 'pig-results.csv', 'text/csv');
    }
  };

  return (
    <button onClick={handleExport} className="btn-secondary">
      Export as {format.toUpperCase()}
    </button>
  );
}

function convertToCSV(results: any[]): string {
  const headers = ['ID', 'Date', 'Summary', 'Trait Count', 'Detection Count', 'Processing Time (ms)'];
  const rows = results.map((r) => [
    r.id,
    r.createdAt,
    r.summary.replace(/"/g, '""'), // Escape quotes
    r.traits.length,
    r.metadata?.detectionCount || 0,
    r.metadata?.processingTimeMs || 0,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
