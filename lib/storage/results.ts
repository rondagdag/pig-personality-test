/**
 * Result Persistence Layer
 * Stores analysis results in Azure Blob Storage as JSON
 */

import { AnalysisResult } from '../types';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';

const STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const STORAGE_ACCOUNT_KEY = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const RESULTS_CONTAINER_NAME = 'pig-results';

function getResultsContainerClient() {
  if (!STORAGE_ACCOUNT_NAME || !STORAGE_ACCOUNT_KEY) {
    throw new Error('Azure Storage is not configured');
  }

  const blobServiceClient = new BlobServiceClient(
    `https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
    new StorageSharedKeyCredential(STORAGE_ACCOUNT_NAME, STORAGE_ACCOUNT_KEY)
  );

  return blobServiceClient.getContainerClient(RESULTS_CONTAINER_NAME);
}

/**
 * Ensure results container exists
 */
export async function ensureResultsContainer(): Promise<void> {
  const containerClient = getResultsContainerClient();
  // For private containers, omit the access property entirely
  await containerClient.createIfNotExists();
}

/**
 * Save analysis result
 */
export async function saveResult(result: AnalysisResult): Promise<void> {
  const containerClient = getResultsContainerClient();
  const blobName = `${result.id}.json`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const data = JSON.stringify(result, null, 2);
  await blockBlobClient.upload(data, data.length, {
    blobHTTPHeaders: {
      blobContentType: 'application/json',
    },
  });
}

/**
 * Get analysis result by ID
 */
export async function getResult(id: string): Promise<AnalysisResult | null> {
  try {
    const containerClient = getResultsContainerClient();
    const blobName = `${id}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const downloadResponse = await blockBlobClient.download(0);
    const data = await streamToString(downloadResponse.readableStreamBody!);
    
    return JSON.parse(data) as AnalysisResult;
  } catch (error) {
    console.error(`Failed to get result ${id}:`, error);
    return null;
  }
}

/**
 * List all results (for admin export)
 */
export async function listAllResults(): Promise<AnalysisResult[]> {
  const containerClient = getResultsContainerClient();
  const results: AnalysisResult[] = [];

  for await (const blob of containerClient.listBlobsFlat()) {
    if (blob.name.endsWith('.json')) {
      const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
      const downloadResponse = await blockBlobClient.download(0);
      const data = await streamToString(downloadResponse.readableStreamBody!);
      results.push(JSON.parse(data) as AnalysisResult);
    }
  }

  return results.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Helper: Convert stream to string
 */
async function streamToString(readableStream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    readableStream.on('data', (data) => {
      chunks.push(data.toString());
    });
    readableStream.on('end', () => {
      resolve(chunks.join(''));
    });
    readableStream.on('error', reject);
  });
}
