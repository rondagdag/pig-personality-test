/**
 * POST /api/analyze
 * 
 * Accepts image upload (base64 or blob URL)
 * Calls Azure Content Understanding
 * Runs pig personality rules
 * Persists result
 * Returns analysis ID and summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { analyzeImage, isPigDescription } from '@/lib/azure/content-understanding';
import { analyzePigDrawing, generateSummary } from '@/lib/scoring/pigRules';
import { uploadBase64Image, ensureContainer } from '@/lib/storage/blob';
import { saveResult, ensureResultsContainer } from '@/lib/storage/results';
import { AnalyzeRequest, AnalyzeResponse, AnalysisResult } from '@/lib/types';

export const runtime = 'nodejs'; // Use Node.js runtime for Azure SDK
export const maxDuration = 60; // 60 seconds max for image analysis

// Basic in-memory rate limiter (token bucket per IP). For production use a distributed rate limiter.
const RATE_LIMIT_CAPACITY = 10; // requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const rateLimitMap = new Map<string, { tokens: number; lastRefill: number }>();

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting by IP
    const ip = (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown').split(',')[0].trim();
    const now = Date.now();
    let bucket = rateLimitMap.get(ip);
    if (!bucket) {
      bucket = { tokens: RATE_LIMIT_CAPACITY, lastRefill: now };
      rateLimitMap.set(ip, bucket);
    }
    if (now - bucket.lastRefill > RATE_LIMIT_WINDOW_MS) {
      bucket.tokens = RATE_LIMIT_CAPACITY;
      bucket.lastRefill = now;
    }
    if (bucket.tokens <= 0) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    bucket.tokens -= 1;

    // Parse request body
    const body: AnalyzeRequest = await request.json();
    const { imageBase64, blobUrl, participantName } = body;

    if (!imageBase64 && !blobUrl) {
      return NextResponse.json(
        { error: 'Either imageBase64 or blobUrl must be provided' },
        { status: 400 }
      );
    }

    // Validate participantName (optional)
    let safeParticipantName = 'drawing';
    if (participantName) {
      if (typeof participantName !== 'string' || participantName.length > 100) {
        return NextResponse.json({ error: 'Invalid participantName' }, { status: 400 });
      }
      safeParticipantName = participantName.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().substring(0, 100) || 'drawing';
    }

    // Validate imageBase64 size/format early to avoid wasted work
    if (imageBase64 && !blobUrl) {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      try {
        const bytes = Buffer.from(base64Data, 'base64');
        const MAX_BYTES = 10 * 1024 * 1024; // 10MB
        if (bytes.length === 0 || bytes.length > MAX_BYTES) {
          return NextResponse.json({ error: 'Image must be less than 10MB' }, { status: 400 });
        }
      } catch (err) {
        return NextResponse.json({ error: 'Invalid base64 image data' }, { status: 400 });
      }
    }

    // Validate blobUrl to avoid SSRF - only allow Azure blob URLs
    if (blobUrl) {
      try {
        const u = new URL(blobUrl);
        if (u.protocol !== 'https:' || !u.hostname.endsWith('.blob.core.windows.net')) {
          return NextResponse.json({ error: 'Invalid blobUrl' }, { status: 400 });
        }
      } catch (err) {
        return NextResponse.json({ error: 'Invalid blobUrl' }, { status: 400 });
      }
    }

    // Ensure containers exist
    await Promise.all([
      ensureContainer(),
      ensureResultsContainer(),
    ]);

    // Step 1: Upload image to blob storage if base64
    // Azure Content Understanding requires a publicly accessible URL
    let imageUrl = blobUrl;
    if (imageBase64 && !blobUrl) {
      const uploadResult = await uploadBase64Image(
        imageBase64,
        `${safeParticipantName}-${Date.now()}.jpg`
      );
      imageUrl = uploadResult.url;
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Failed to generate image URL for analysis' },
        { status: 400 }
      );
    }

    // Step 2: Analyze image with Azure Content Understanding
    // Must use URL (API does not support base64 directly)
    const detection = await analyzeImage({
      imageUrl,
    });

    // Step 2.5: Validate that the image contains a pig
    if (!detection.description) {
      return NextResponse.json(
        { 
          error: 'Unable to analyze image',
          message: 'Could not generate a description of the image. Please ensure the image is clear and try again.'
        },
        { status: 400 }
      );
    }

    if (!isPigDescription(detection.description)) {
      return NextResponse.json(
        { 
          error: 'Not a pig drawing',
          message: 'This image does not appear to contain a pig drawing. Please upload a drawing of a pig to receive your personality analysis.',
          description: detection.description
        },
        { status: 400 }
      );
    }

    // Step 3: Run pig personality rules
    const traits = analyzePigDrawing(detection);
    const summary = generateSummary(traits);

    // Step 4: Create result object
    const resultId = uuidv4();
    const result: AnalysisResult = {
      id: resultId,
      imageUrl,
      traits,
      summary,
      createdAt: new Date().toISOString(),
      description: detection.description,
      descriptionConfidence: detection.descriptionConfidence,
      metadata: {
        detectionCount: detection.detailCount,
        processingTimeMs: Date.now() - startTime,
      },
    };

    // Step 5: Persist result
    await saveResult(result);

    // Step 6: Return response
    const response: AnalyzeResponse = {
      id: resultId,
      summary,
      evidence: traits.map(t => t.evidence),
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error('Analysis error:', error);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze image',
        message: error.message || 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to check service health
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Draw the Pig Personality Test API',
    version: '1.0.0',
  });
}
