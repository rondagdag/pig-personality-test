import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Draw the Pig Personality Test",
  description: "Snap your doodle. Get your vibe. AI-powered personality analysis from your pig drawing.",
  keywords: ["personality test", "pig drawing", "AI analysis", "psychology"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-14 sm:h-16 items-center">
              <a href="/" className="flex items-center space-x-2 sm:space-x-3">
                <span className="text-2xl sm:text-3xl">🐷</span>
                <span className="font-bold text-lg sm:text-xl text-gray-900 dark:text-white">
                  Draw the Pig
                </span>
              </a>
              <div className="flex gap-2 sm:gap-4">
                <a href="/group" className="text-sm sm:text-base text-gray-700 dark:text-gray-300 hover:text-pink-600 dark:hover:text-pink-400 font-medium">
                  Group
                </a>
                <a href="/admin" className="text-sm sm:text-base text-gray-700 dark:text-gray-300 hover:text-pink-600 dark:hover:text-pink-400 font-medium">
                  Admin
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto py-6 sm:py-8">
          {children}
        </main>
        <footer className="mt-12 sm:mt-16 py-6 sm:py-8 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
            <p>🐷 Powered by Azure AI Content Understanding</p>
            <p className="mt-2">Your drawings are analyzed with privacy in mind. Images are deleted after 24 hours.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
