/**
 * Azure AI Content Understanding REST API Client
 * 
 * Follows Microsoft Learn quickstart pattern:
 * https://learn.microsoft.com/en-us/azure/ai-services/content-understanding/quickstart/use-rest-api
 * 
 * Request format:
 * POST {endpoint}/contentunderstanding/analyzers/{analyzerId}:analyze?api-version=2025-05-01-preview
 * Headers:
 *   - Ocp-Apim-Subscription-Key: {key}
 *   - Content-Type: application/json
 * Body: { "url": "{imageUrl}" } or { "data": "{base64}" }
 */

import { AzureAnalyzerResponse, Detection, BoundingBox } from '../types';

const CONTENT_UNDERSTANDING_ENDPOINT = process.env.CONTENT_UNDERSTANDING_ENDPOINT;
const CONTENT_UNDERSTANDING_KEY = process.env.CONTENT_UNDERSTANDING_KEY;
const API_VERSION = '2025-05-01-preview';
const ANALYZER_ID = 'prebuilt-imageAnalyzer'; // Using prebuilt image analyzer for pig detection

// Polling configuration
const POLLING_INTERVAL_MS = 1000; // 1 second
const MAX_POLLING_ATTEMPTS = 60; // 60 seconds max wait

if (!CONTENT_UNDERSTANDING_ENDPOINT || !CONTENT_UNDERSTANDING_KEY) {
  console.warn('⚠️ Azure Content Understanding credentials not configured. Set CONTENT_UNDERSTANDING_ENDPOINT and CONTENT_UNDERSTANDING_KEY.');
}

export interface AnalyzeImageOptions {
  imageUrl?: string;
  imageBase64?: string;
}

/**
 * Analyze an image using Azure AI Content Understanding
 * Returns a Detection object with pig features extracted from the analysis
 */
export async function analyzeImage(options: AnalyzeImageOptions): Promise<Detection> {
  if (!CONTENT_UNDERSTANDING_ENDPOINT || !CONTENT_UNDERSTANDING_KEY) {
    throw new Error('Azure Content Understanding is not configured. Check environment variables.');
  }

  const { imageUrl, imageBase64 } = options;

  if (!imageUrl && !imageBase64) {
    throw new Error('Either imageUrl or imageBase64 must be provided');
  }

  // Step 1: Submit analysis request
  const requestId = await submitAnalysisRequest(imageUrl, imageBase64);

  // Step 2: Poll for results
  const response = await pollForResults(requestId);

  // Step 3: Transform Azure response to internal Detection model
  const detection = transformToDetection(response);

  return detection;
}

/**
 * Submit image analysis request to Azure
 * Returns the request ID for polling
 */
async function submitAnalysisRequest(imageUrl?: string, imageBase64?: string): Promise<string> {
  const endpoint = `${CONTENT_UNDERSTANDING_ENDPOINT}/contentunderstanding/analyzers/${ANALYZER_ID}:analyze?api-version=${API_VERSION}`;

  const body = imageUrl 
    ? { url: imageUrl }
    : { data: imageBase64 };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': CONTENT_UNDERSTANDING_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to submit analysis request: ${response.status} ${error}`);
  }

  // Extract request-id from response headers or Operation-Location
  const requestId = response.headers.get('request-id') || 
                    response.headers.get('apim-request-id') ||
                    response.headers.get('Operation-Location')?.split('/').pop()?.split('?')[0];

  if (!requestId) {
    throw new Error('Failed to extract request ID from response');
  }

  return requestId;
}

/**
 * Poll for analysis results until completion
 */
async function pollForResults(requestId: string): Promise<AzureAnalyzerResponse> {
  const endpoint = `${CONTENT_UNDERSTANDING_ENDPOINT}/contentunderstanding/analyzerResults/${requestId}?api-version=${API_VERSION}`;

  for (let attempt = 0; attempt < MAX_POLLING_ATTEMPTS; attempt++) {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': CONTENT_UNDERSTANDING_KEY!,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get analysis results: ${response.status} ${error}`);
    }

    const result: AzureAnalyzerResponse = await response.json();

    if (result.status === 'Succeeded') {
      return result;
    }

    if (result.status === 'Failed') {
      throw new Error(`Analysis failed: ${result.error?.message || 'Unknown error'}`);
    }

    // Still running, wait and retry
    await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
  }

  throw new Error('Analysis timed out after maximum polling attempts');
}

/**
 * Transform Azure Content Understanding response to internal Detection model
 * Extracts pig features from detected objects and regions
 */
function transformToDetection(response: AzureAnalyzerResponse): Detection {
  const result = response.result;
  
  if (!result) {
    throw new Error('No result in analysis response');
  }

  // Default canvas size (will be updated from actual detections)
  let canvasWidth = 1000;
  let canvasHeight = 1000;

  // Extract objects/regions from response
  const objects = result.objects || [];
  const detailCount = objects.length;

  // Categorize detected regions by pig anatomy
  const head = objects.find(obj => 
    obj.category.toLowerCase().includes('head') || 
    obj.category.toLowerCase().includes('face')
  );

  const body = objects.find(obj => 
    obj.category.toLowerCase().includes('body') || 
    obj.category.toLowerCase().includes('torso')
  );

  const legs = objects.filter(obj => 
    obj.category.toLowerCase().includes('leg') || 
    obj.category.toLowerCase().includes('foot')
  );

  const ears = objects.filter(obj => 
    obj.category.toLowerCase().includes('ear')
  );

  const tail = objects.find(obj => 
    obj.category.toLowerCase().includes('tail')
  );

  // Calculate overall bounding box (union of all detections)
  const allBoxes = objects.map(obj => obj.boundingBox);
  const overallBox = calculateOverallBoundingBox(allBoxes);

  // Update canvas size from overall bounding box if available
  if (overallBox && objects.length > 0) {
    canvasWidth = Math.max(overallBox.x + overallBox.width, canvasWidth);
    canvasHeight = Math.max(overallBox.y + overallBox.height, canvasHeight);
  }

  const detection: Detection = {
    head: head ? {
      boundingBox: head.boundingBox,
      confidence: head.confidence,
      category: head.category,
    } : undefined,
    body: body ? {
      boundingBox: body.boundingBox,
      confidence: body.confidence,
      category: body.category,
    } : undefined,
    legs: legs.map(leg => ({
      boundingBox: leg.boundingBox,
      confidence: leg.confidence,
      category: leg.category,
    })),
    ears: ears.map(ear => ({
      boundingBox: ear.boundingBox,
      confidence: ear.confidence,
      category: ear.category,
    })),
    tail: tail ? {
      boundingBox: tail.boundingBox,
      confidence: tail.confidence,
      category: tail.category,
    } : undefined,
    overall: {
      boundingBox: overallBox || { x: 0, y: 0, width: canvasWidth, height: canvasHeight },
      canvas: {
        width: canvasWidth,
        height: canvasHeight,
      },
    },
    detailCount,
  };

  return detection;
}

/**
 * Calculate overall bounding box from multiple boxes (union)
 */
function calculateOverallBoundingBox(boxes: BoundingBox[]): BoundingBox | null {
  if (boxes.length === 0) return null;

  const minX = Math.min(...boxes.map(b => b.x));
  const minY = Math.min(...boxes.map(b => b.y));
  const maxX = Math.max(...boxes.map(b => b.x + b.width));
  const maxY = Math.max(...boxes.map(b => b.y + b.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Test function to validate Azure connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    if (!CONTENT_UNDERSTANDING_ENDPOINT || !CONTENT_UNDERSTANDING_KEY) {
      return false;
    }

    // Simple test with a sample image URL
    const testUrl = 'https://github.com/Azure-Samples/azure-ai-content-understanding-python/raw/refs/heads/main/data/pieChart.jpg';
    
    await submitAnalysisRequest(testUrl);
    return true;
  } catch (error) {
    console.error('Azure connection test failed:', error);
    return false;
  }
}
