import Link from 'next/link';

export default function Home() {
  return (
    <div className="text-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
            🐷 Draw the Pig
          </h1>
          <p className="text-xl sm:text-2xl text-pink-600 dark:text-pink-400 font-medium mb-4 sm:mb-6">
            Snap your doodle. Get your vibe.
          </p>
          <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto px-4">
            Draw a pig on paper for 5 minutes, upload a photo, and discover what your drawing reveals about your personality. 
            Powered by AI and psychology.
          </p>
        </div>

        {/* CTA Button */}
        <div className="mb-12 sm:mb-16">
          <Link href="/draw" className="btn-primary text-base sm:text-lg inline-block w-auto">
            Start Drawing →
          </Link>
        </div>

        {/* How It Works */}
        <div className="card text-left mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">✏️</div>
              <h3 className="font-semibold text-base sm:text-lg mb-2">1. Draw</h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Take 5 minutes to draw a pig on paper. Don&apos;t overthink it—just draw!
              </p>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">📸</div>
              <h3 className="font-semibold text-base sm:text-lg mb-2">2. Upload</h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Snap a photo of your drawing or upload an existing image.
              </p>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">✨</div>
              <h3 className="font-semibold text-base sm:text-lg mb-2">3. Discover</h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Get instant AI-powered insights about your personality traits.
              </p>
            </div>
          </div>
        </div>

        {/* What We Analyze */}
        <div className="card text-left mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
            What We Analyze
          </h2>
          <ul className="space-y-3 text-sm sm:text-base text-gray-700 dark:text-gray-300">
            <li className="flex items-start">
              <span className="text-pink-600 mr-2">📍</span>
              <span><strong>Placement:</strong> Where your pig sits on the page (top, middle, bottom)</span>
            </li>
            <li className="flex items-start">
              <span className="text-pink-600 mr-2">🧭</span>
              <span><strong>Orientation:</strong> Which direction your pig is facing (left, right, front)</span>
            </li>
            <li className="flex items-start">
              <span className="text-pink-600 mr-2">🔍</span>
              <span><strong>Detail Level:</strong> How many features you included</span>
            </li>
            <li className="flex items-start">
              <span className="text-pink-600 mr-2">🦵</span>
              <span><strong>Legs:</strong> How many legs your pig has (stability indicator)</span>
            </li>
            <li className="flex items-start">
              <span className="text-pink-600 mr-2">👂</span>
              <span><strong>Ears:</strong> Size relative to head (listening skills)</span>
            </li>
            <li className="flex items-start">
              <span className="text-pink-600 mr-2">🎯</span>
              <span><strong>Tail:</strong> Length relative to body (intelligence indicator)</span>
            </li>
          </ul>
        </div>

        {/* Group Mode Promo */}
        <div className="card bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 text-left">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
            🎉 Try Group Mode
          </h2>
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-3 sm:mb-4">
            Perfect for team building, parties, or classroom activities. Have everyone draw a pig, 
            upload all drawings together, and compare results with discussion prompts.
          </p>
          <Link href="/group" className="btn-secondary inline-block w-auto">
            Start Group Session
          </Link>
        </div>

        {/* Privacy Note */}
        <div className="mt-8 text-sm text-gray-600 dark:text-gray-400">
          <p>
            🔒 <strong>Privacy First:</strong> Your drawings are processed securely and automatically 
            deleted after 24 hours. We don&apos;t store any personal information.
          </p>
        </div>
      </div>
    </div>
  );
}
