'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const TIMER_DURATION_SECONDS = 5 * 60; // 5 minutes

export default function DrawPage() {
  const router = useRouter();
  const [timeRemaining, setTimeRemaining] = useState(TIMER_DURATION_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          setIsComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeRemaining(TIMER_DURATION_SECONDS);
    setIsComplete(false);
  };

  const handleNext = () => {
    router.push('/upload');
  };

  const handleSkip = () => {
    router.push('/upload');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = ((TIMER_DURATION_SECONDS - timeRemaining) / TIMER_DURATION_SECONDS) * 100;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
          🎨 Draw Your Pig
        </h1>
        <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300">
          Take 5 minutes to draw a pig on paper. When the timer ends, you&apos;ll upload a photo.
        </p>
      </div>

      {/* Timer Card */}
      <div className="card text-center mb-6 sm:mb-8">
        <div className="mb-4 sm:mb-6">
          <div className="timer-display mb-4">
            {formatTime(timeRemaining)}
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-6">
            <div
              className="bg-pink-600 h-3 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Status Messages */}
          {!isRunning && !isComplete && (
            <p className="text-gray-600 dark:text-gray-400">
              Click &quot;Start Drawing&quot; when you&apos;re ready to begin!
            </p>
          )}
          {isRunning && (
            <p className="text-pink-600 dark:text-pink-400 font-medium animate-pulse">
              ✏️ Drawing in progress...
            </p>
          )}
          {isComplete && (
            <p className="text-green-600 dark:text-green-400 font-bold text-xl">
              ✅ Time&apos;s up! Great job!
            </p>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4">
          {!isRunning && !isComplete && (
            <>
              <button onClick={handleStart} className="btn-primary w-full sm:w-auto">
                Start Drawing
              </button>
              <button onClick={handleSkip} className="btn-secondary w-full sm:w-auto">
                Skip Timer →
              </button>
            </>
          )}
          {isRunning && (
            <>
              <button onClick={handlePause} className="btn-secondary w-full sm:w-auto">
                Pause
              </button>
              <button onClick={handleSkip} className="btn-secondary w-full sm:w-auto">
                Skip Timer →
              </button>
            </>
          )}
          {!isRunning && timeRemaining < TIMER_DURATION_SECONDS && !isComplete && (
            <>
              <button onClick={handleStart} className="btn-primary w-full sm:w-auto">
                Resume
              </button>
              <button onClick={handleReset} className="btn-secondary w-full sm:w-auto">
                Reset
              </button>
              <button onClick={handleSkip} className="btn-secondary w-full sm:w-auto">
                Skip Timer →
              </button>
            </>
          )}
          {isComplete && (
            <>
              <button onClick={handleNext} className="btn-primary w-full sm:w-auto">
                Next: Upload Photo →
              </button>
              <button onClick={handleReset} className="btn-secondary w-full sm:w-auto">
                Draw Again
              </button>
            </>
          )}
        </div>
      </div>

      {/* Drawing Tips */}
      <div className="card bg-blue-50 dark:bg-blue-900/20">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          💡 Drawing Tips
        </h2>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300">
          <li>• Draw whatever comes to mind—there&apos;s no right or wrong way!</li>
          <li>• Use any drawing materials you have (pencil, pen, crayons, etc.)</li>
          <li>• Include as many or as few details as you like</li>
          <li>• Draw on any paper size (standard, notebook, sketch pad)</li>
          <li>• Make sure your drawing is clear and visible</li>
          <li>• Have fun! This is about self-expression, not artistic skill</li>
        </ul>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>⌨️ Keyboard shortcuts: Space/Enter to start/pause</p>
      </div>
    </div>
  );
}
