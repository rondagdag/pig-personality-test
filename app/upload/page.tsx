'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const router = useRouter();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB');
      return;
    }

    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    
    if (!file) return;

    // Trigger file input change with dropped file
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    if (fileInputRef.current) {
      fileInputRef.current.files = dataTransfer.files;
      handleFileSelect({ target: fileInputRef.current } as any);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleCameraCapture = () => {
    // Trigger file input with camera
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.capture = 'environment' as any;
      fileInputRef.current.click();
    }
  };

  const handleRetry = () => {
    setImagePreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!imagePreview) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: imagePreview,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to analyze image');
      }

      const result = await response.json();
      
      // Redirect to results page
      router.push(`/results/${result.id}`);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze image. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
          📸 Upload Your Drawing
        </h1>
        <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300">
          Take a photo of your pig drawing or upload an existing image.
        </p>
      </div>

      {!imagePreview ? (
        /* Upload Area */
        <div className="card">
          <div
            className="border-4 border-dashed border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl p-6 sm:p-12 text-center hover:border-pink-400 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">📷</div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Drop your image here
            </h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
              or click to browse files
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="btn-secondary w-full sm:w-auto"
              >
                Choose File
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCameraCapture();
                }}
                className="btn-primary w-full sm:w-auto"
              >
                📸 Use Camera
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {error && (
            <div className="mt-4 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm sm:text-base text-red-700 dark:text-red-300">
              ⚠️ {error}
            </div>
          )}

          <div className="mt-4 sm:mt-6 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <p className="mb-2"><strong>Tips for best results:</strong></p>
            <ul className="space-y-1 ml-4">
              <li>• Ensure good lighting with no shadows</li>
              <li>• Place paper on a flat surface</li>
              <li>• Capture the entire drawing with some margin</li>
              <li>• Avoid glare from glossy paper</li>
              <li>• Maximum file size: 10MB</li>
            </ul>
          </div>
        </div>
      ) : (
        /* Preview and Analyze */
        <div className="card">
          <div className="mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
              Preview
            </h3>
            <div className="relative">
              <img
                src={imagePreview}
                alt="Your pig drawing"
                className="w-full max-h-64 sm:max-h-96 object-contain rounded-lg border-2 border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm sm:text-base text-red-700 dark:text-red-300">
              ⚠️ {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <button
              onClick={handleRetry}
              className="btn-secondary w-full sm:w-auto"
              disabled={isUploading}
            >
              Choose Different Image
            </button>
            <button
              onClick={handleAnalyze}
              className="btn-primary w-full sm:w-auto"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Analyzing...
                </>
              ) : (
                'Analyze My Drawing →'
              )}
            </button>
          </div>

          {isUploading && (
            <div className="mt-4 sm:mt-6 text-center text-sm sm:text-base text-gray-600 dark:text-gray-400">
              <p className="animate-pulse">
                🤖 AI is analyzing your drawing... This may take 30-60 seconds.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
