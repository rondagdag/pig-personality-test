import { notFound } from 'next/navigation';
import { getResult } from '@/lib/storage/results';
import Link from 'next/link';

export default async function ResultsPage({ params }: { params: { id: string } }) {
  const result = await getResult(params.id);

  if (!result) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          ✨ Your Personality Profile
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Based on your pig drawing analysis
        </p>
      </div>

      {/* Main Result Card */}
      <div className="card mb-8">
        <div className="flex items-start space-x-4 mb-6">
          <span className="text-5xl">🐷</span>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Your Summary
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              {result.summary}
            </p>
          </div>
        </div>

        {/* Image Preview if available */}
        {result.imageUrl && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Your Drawing
            </h3>
            <img
              src={result.imageUrl}
              alt="Your pig drawing"
              className="w-full max-h-96 object-contain rounded-lg border-2 border-gray-200 dark:border-gray-700"
            />
          </div>
        )}
      </div>

      {/* Trait Details */}
      <div className="card mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          🔍 Why We Think So
        </h2>
        
        <div className="space-y-6">
          {result.traits.map((trait, index) => (
            <div key={index} className="border-l-4 border-pink-500 pl-4 py-2">
              <div className="flex items-center mb-2">
                <span className="trait-badge capitalize">{trait.category}</span>
                <span className="evidence-chip">{trait.evidence.key}</span>
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                You <span className="font-medium">{trait.statement}</span>
              </p>
              {trait.evidence.confidence && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Confidence: {Math.round(trait.evidence.confidence * 100)}%
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Metadata */}
      {result.metadata && (
        <div className="card bg-gray-50 dark:bg-gray-800/50 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            📊 Analysis Details
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Features Detected:</span>
              <span className="ml-2 font-semibold">{result.metadata.detectionCount}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Processing Time:</span>
              <span className="ml-2 font-semibold">{(result.metadata.processingTimeMs / 1000).toFixed(1)}s</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-600 dark:text-gray-400">Analyzed:</span>
              <span className="ml-2 font-semibold">
                {new Date(result.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center space-x-4 mb-8">
        <Link href="/" className="btn-secondary">
          ← Back Home
        </Link>
        <Link href="/draw" className="btn-primary">
          Draw Another Pig
        </Link>
        <Link href="/group" className="btn-secondary">
          Try Group Mode
        </Link>
      </div>

      {/* Share/Explanation */}
      <div className="card bg-blue-50 dark:bg-blue-900/20">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          📖 About This Analysis
        </h3>
        <p className="text-gray-700 dark:text-gray-300 text-sm">
          The "Draw the Pig" personality test is a projective psychological assessment based on how you 
          draw a pig. Our AI analyzes your drawing's placement, orientation, detail level, and specific 
          features to provide insights. Remember, this is for entertainment and self-reflection—not a 
          clinical diagnosis. Results are based on established psychological interpretations of the test.
        </p>
      </div>

      {/* Result ID for reference */}
      <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
        <p>Result ID: {result.id}</p>
      </div>
    </div>
  );
}
