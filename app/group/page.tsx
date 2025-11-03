'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GroupParticipant } from '@/lib/types';

export default function GroupPage() {
  const router = useRouter();
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [currentName, setCurrentName] = useState('');
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleStartCamera = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera access is not supported. Please use HTTPS or upload a file instead.');
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permissions.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Failed to access camera: ' + err.message);
      }
    }
  };

  const handleStopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg');
    setCurrentImage(imageData);
    handleStopCamera();
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setCurrentImage(e.target?.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAddParticipant = async () => {
    if (!currentName.trim()) {
      setError('Please enter a participant name');
      return;
    }

    if (!currentImage) {
      setError('Please select an image');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: currentImage,
          participantName: currentName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.message || errorData.error || 'Failed to analyze image');
      }

      const result = await response.json();

      // Extract participant data from result
      const placement = extractPlacement(result.evidence);
      const orientation = extractOrientation(result.evidence);
      const legs = extractLegs(result.evidence);
      const details = extractDetails(result.evidence);

      const newParticipant: GroupParticipant = {
        id: result.id,
        name: currentName,
        placement,
        orientation,
        legs,
        detailLevel: details,
        traits: result.summary.split('.').filter((s: string) => s.trim()),
        imageUrl: currentImage,
      };

      setParticipants([...participants, newParticipant]);
      setCurrentName('');
      setCurrentImage(null);
      setIsUploading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze image');
      setIsUploading(false);
    }
  };

  const handleClearImage = () => {
    setCurrentImage(null);
    handleStopCamera();
  };

  const handleViewResults = () => {
    if (participants.length === 0) return;
    
    // Store participants in sessionStorage for results page
    sessionStorage.setItem('groupParticipants', JSON.stringify(participants));
    router.push('/group/results');
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          🎉 Group Mode
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Have everyone draw a pig, then upload all drawings to compare results
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Upload Area */}
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Add Participant
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Participant Name
              </label>
              <input
                type="text"
                value={currentName}
                onChange={(e) => setCurrentName(e.target.value)}
                placeholder="Enter name..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 dark:bg-gray-800 dark:text-white"
                disabled={isUploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Drawing Image
              </label>

              {!currentImage && !isCameraActive && (
                <div className="space-y-2">
                  <button
                    onClick={handleStartCamera}
                    className="w-full btn-primary"
                    disabled={isUploading}
                  >
                    📷 Take Photo
                  </button>
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                    or
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageSelect}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100 dark:file:bg-pink-900/20 dark:file:text-pink-300"
                    disabled={isUploading}
                  />
                </div>
              )}

              {isCameraActive && (
                <div className="space-y-2">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg border-2 border-gray-200 dark:border-gray-700"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCapture}
                      className="flex-1 btn-primary"
                    >
                      Capture
                    </button>
                    <button
                      onClick={handleStopCamera}
                      className="flex-1 btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {currentImage && (
                <div className="space-y-2">
                  <img
                    src={currentImage}
                    alt="Preview"
                    className="w-full rounded-lg border-2 border-gray-200 dark:border-gray-700"
                  />
                  <button
                    onClick={handleClearImage}
                    className="w-full btn-secondary text-sm"
                    disabled={isUploading}
                  >
                    Take Another Photo
                  </button>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleAddParticipant}
              className="w-full btn-primary"
              disabled={isUploading || !currentName.trim() || !currentImage}
            >
              {isUploading ? 'Analyzing...' : 'Add Participant'}
            </button>
          </div>
        </div>

        {/* Participants List */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Participants ({participants.length})
            </h2>
            {participants.length > 0 && (
              <button onClick={handleViewResults} className="btn-primary text-sm">
                View Results →
              </button>
            )}
          </div>

          {participants.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>No participants yet. Add your first drawing!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {p.imageUrl && (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {p.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {p.placement} • {p.orientation} • {p.legs} legs
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveParticipant(p.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="card bg-blue-50 dark:bg-blue-900/20">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          📋 How Group Mode Works
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
          <li>Have everyone in your group draw a pig (5 minutes each)</li>
          <li>Upload each person&apos;s drawing with their name</li>
          <li>Once all drawings are uploaded, click &quot;View Results&quot;</li>
          <li>Compare placements, orientations, and traits</li>
          <li>Use discussion prompts to explore personality differences</li>
        </ol>
      </div>
    </div>
  );
}

// Helper functions to extract data from evidence
function extractPlacement(evidence: any[]): 'Top' | 'Middle' | 'Bottom' {
  const placement = evidence.find(e => e.key.startsWith('placement='));
  if (placement?.key.includes('Top')) return 'Top';
  if (placement?.key.includes('Bottom')) return 'Bottom';
  return 'Middle';
}

function extractOrientation(evidence: any[]): 'Left' | 'Right' | 'Front' {
  const orientation = evidence.find(e => e.key.startsWith('orientation='));
  if (orientation?.key.includes('Left')) return 'Left';
  if (orientation?.key.includes('Right')) return 'Right';
  return 'Front';
}

function extractLegs(evidence: any[]): number {
  const legs = evidence.find(e => e.key.startsWith('legs='));
  return legs ? parseInt(legs.key.split('=')[1]) : 4;
}

function extractDetails(evidence: any[]): 'Many' | 'Few' {
  const details = evidence.find(e => e.key.startsWith('details='));
  return details?.key.includes('Many') ? 'Many' : 'Few';
}
