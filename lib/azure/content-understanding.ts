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
const CUSTOM_ANALYZER_ID = 'pig-feature-analyzer'; // Custom analyzer that emits the fields our rules engine expects

// Polling configuration
const POLLING_INTERVAL_MS = 1000; // 1 second
const MAX_POLLING_ATTEMPTS = 60; // 60 seconds max wait

if (!CONTENT_UNDERSTANDING_ENDPOINT || !CONTENT_UNDERSTANDING_KEY) {
  console.warn('⚠️ Azure Content Understanding credentials not configured. Set CONTENT_UNDERSTANDING_ENDPOINT and CONTENT_UNDERSTANDING_KEY.');
}

export interface AnalyzeImageOptions {
  imageUrl: string; // Azure Content Understanding requires a publicly accessible URL
}

export { isPigDescription };

/**
 * Return a JSON body suitable for creating a custom analyzer in Azure Content Understanding.
 * This defines the contract (the fields) our app expects so `transformToDetection()` can map
 * analyzer outputs into the internal `Detection` model.
 *
 * You may PUT this object to
 * {endpoint}/contentunderstanding/analyzers/{analyzerId}?api-version={API_VERSION}
 * to register the analyzer (requires proper permissions).
 */
export function getCustomAnalyzerDefinition() {
  return {
    baseAnalyzerId: ANALYZER_ID, // Extend the prebuilt image analyzer
    description: 'Pig drawing feature extractor: emits placement, orientation, detailCount, legCount, earSize, tailLength and detected regions',
    config: {
      disableContentFiltering: false
    },
    // fieldSchema defines custom fields to extract using Azure Content Understanding format
    // Note: Complex nested structures are not supported, so we define simple scalar fields only
    fieldSchema: {
      fields: {
        ImageDescription: {
          type: 'string',
          description: 'Detailed description of the pig drawing including visual characteristics, style, and notable features'
        },
        VerticalPlacement: {
          type: 'string',
          description: 'Vertical placement of the pig drawing: Top, Middle, or Bottom'
        },
        Orientation: {
          type: 'string',
          description: 'Orientation of the pig: Left, Right, or Front'
        },
        DetailCount: {
          type: 'number',
          description: 'Number of small detail objects detected in the drawing'
        },
        LegCount: {
          type: 'number',
          description: 'Number of legs visible in the pig drawing'
        },
        EarSize: {
          type: 'string',
          description: 'Size of the pig ears: Large or Normal'
        },
        TailLength: {
          type: 'number',
          description: 'Relative tail length from 0 to 1, where 0 is no tail and 1 is very long tail'
        }
      }
    }
  };
}

/**
 * Create or update the custom analyzer in Azure. Returns true on success.
 */
export async function createCustomAnalyzer(): Promise<boolean> {
  // Read from process.env directly to support runtime configuration
  const endpoint = process.env.CONTENT_UNDERSTANDING_ENDPOINT;
  const key = process.env.CONTENT_UNDERSTANDING_KEY;
  
  if (!endpoint || !key) {
    throw new Error('Azure Content Understanding is not configured. Check environment variables.');
  }

  const analyzerEndpoint = `${endpoint}/contentunderstanding/analyzers/${CUSTOM_ANALYZER_ID}?api-version=${API_VERSION}`;
  const body = getCustomAnalyzerDefinition();

  const response = await fetch(analyzerEndpoint, {
    method: 'PUT',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Failed to create custom analyzer:', response.status, err);
    return false;
  }

  console.log('Custom analyzer created or updated:', CUSTOM_ANALYZER_ID);
  return true;
}

/**
 * Analyze an image using Azure AI Content Understanding
 * Returns a Detection object with pig features extracted from the analysis
 * 
 * Note: Azure Content Understanding API only accepts publicly accessible URLs,
 * not base64 data. Upload images to blob storage first before calling this function.
 */
export async function analyzeImage(options: AnalyzeImageOptions): Promise<Detection> {
  if (!CONTENT_UNDERSTANDING_ENDPOINT || !CONTENT_UNDERSTANDING_KEY) {
    throw new Error('Azure Content Understanding is not configured. Check environment variables.');
  }

  const { imageUrl } = options;

  if (!imageUrl) {
    throw new Error('imageUrl is required for Azure Content Understanding API');
  }

  // Step 1: Submit analysis request
  console.log('🔄 Submitting analysis request for:', imageUrl);
  const requestId = await submitAnalysisRequest(imageUrl);
  console.log('✅ Analysis request submitted. Request ID:', requestId);

  // Step 2: Poll for results
  console.log('⏳ Polling for analysis results...');
  const response = await pollForResults(requestId);
  console.log('📊 Analysis complete. Raw response:', JSON.stringify(response, null, 2));

  // Step 3: Transform Azure response to internal Detection model
  const detection = transformToDetection(response);
  console.log('🔄 Transformed detection:', JSON.stringify(detection, null, 2));

  return detection;
}

/**
 * Submit image analysis request to Azure
 * Returns the request ID for polling
 */
async function submitAnalysisRequest(imageUrl: string): Promise<string> {
  const endpoint = `${CONTENT_UNDERSTANDING_ENDPOINT}/contentunderstanding/analyzers/${CUSTOM_ANALYZER_ID}:analyze?api-version=${API_VERSION}`;

  // Azure Content Understanding API format: {"url": "https://..."}
  const body = { url: imageUrl };

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
      console.log('✅ Analysis succeeded after', attempt + 1, 'attempts');
      console.log('📋 Result details:', JSON.stringify(result.result, null, 2));
      return result;
    }

    if (result.status === 'Failed') {
      console.error('❌ Analysis failed:', result.error);
      throw new Error(`Analysis failed: ${result.error?.message || 'Unknown error'}`);
    }

    // Still running, wait and retry
    if (attempt % 5 === 0) {
      console.log(`⏳ Still polling... (attempt ${attempt + 1}/${MAX_POLLING_ATTEMPTS}, status: ${result.status})`);
    }
    await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
  }

  throw new Error('Analysis timed out after maximum polling attempts');
}

/**
 * Check if the description indicates the image contains a pig
 */
function isPigDescription(description: string | undefined): boolean {
  if (!description) return false;
  
  const descriptionLower = description.toLowerCase();
  
  // Check for pig-related keywords
  const pigKeywords = ['pig', 'porcine', 'swine', 'hog', 'piglet'];
  const hasPigKeyword = pigKeywords.some(keyword => descriptionLower.includes(keyword));
  
  // Additional check: description mentions pig anatomy or drawing-like terms
  const anatomyKeywords = ['snout', 'curly tail', 'trotters'];
  const hasAnatomyKeyword = anatomyKeywords.some(keyword => descriptionLower.includes(keyword));
  
  return hasPigKeyword || hasAnatomyKeyword;
}

/**
 * Transform Azure Content Understanding response to internal Detection model
 * Extracts pig features from custom analyzer fields
 * 
 * Note: Custom analyzer provides direct values (verticalPlacement, orientation, etc.)
 * so bounding boxes are not needed. Rules engine uses direct values when available.
 */
function transformToDetection(response: AzureAnalyzerResponse): Detection {
  const result = response.result;
  
  if (!result) {
    throw new Error('No result in analysis response');
  }

  // Extract custom analyzer fields from contents[0].fields
  const fields = result.contents?.[0]?.fields;
  
  if (!fields) {
    console.warn('⚠️ No custom analyzer fields found in response');
    throw new Error('Custom analyzer did not return expected fields');
  }

  // Extract image description from custom analyzer (ImageDescription field)
  const description = fields.ImageDescription?.valueString;
  const descriptionConfidence = description ? 0.95 : undefined;
  if (description) {
    console.log(`📝 Image description: "${description}"`);
  }

  // Extract detail count from custom analyzer (DetailCount field)
  const detailCount = fields.DetailCount?.valueNumber ?? 0;
  console.log(`🔍 Detail count from analyzer: ${detailCount}`);

  // Initialize detection object with minimal data (bounding boxes not used)
  const detection: Detection = {
    overall: {
      boundingBox: { x: 0, y: 0, width: 1000, height: 1000 },
      canvas: { width: 1000, height: 1000 },
    },
    detailCount,
    description,
    descriptionConfidence,
  };

  // --- Extract custom analyzer fields ---
  // These direct values are used by the rules engine

  // Vertical placement: Top / Middle / Bottom
  const verticalPlacement = fields.VerticalPlacement?.valueString;
  if (verticalPlacement) {
    (detection as any).verticalPlacement = verticalPlacement;
    console.log(`📍 Vertical placement: ${verticalPlacement}`);
  }

  // Orientation: Left / Right / Front
  const orientation = fields.Orientation?.valueString;
  if (orientation) {
    (detection as any).orientation = orientation;
    console.log(`🧭 Orientation: ${orientation}`);
  }

  // LegCount: integer
  const legCount = fields.LegCount?.valueNumber;
  if (typeof legCount === 'number') {
    (detection as any).legCount = legCount;
    console.log(`🦵 Leg count: ${legCount}`);
  }

  // EarSize: Large | Normal
  const earSize = fields.EarSize?.valueString;
  if (earSize) {
    (detection as any).earSize = earSize;
    console.log(`👂 Ear size: ${earSize}`);
  }

  // TailLength: numeric (0 to 1)
  const tailLength = fields.TailLength?.valueNumber;
  if (typeof tailLength === 'number') {
    (detection as any).tailLength = tailLength;
    console.log(`🐷 Tail length: ${tailLength}`);
  }

  console.log('✅ Transformed detection with custom analyzer fields');
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
