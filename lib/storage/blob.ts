/**
 * Azure Blob Storage Helper
 * Handles temporary image storage with SAS tokens
 */

import { BlobServiceClient, ContainerClient, BlobSASPermissions, generateBlobSASQueryParameters, StorageSharedKeyCredential } from '@azure/storage-blob';
import { StorageUploadResult } from '../types';

const STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const STORAGE_ACCOUNT_KEY = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'pig-images';

// SAS token expiry: 2 hours
const SAS_EXPIRY_HOURS = 2;

// Image retention: delete after 24 hours
const IMAGE_RETENTION_HOURS = 24;

if (!STORAGE_ACCOUNT_NAME || !STORAGE_ACCOUNT_KEY) {
  console.warn('⚠️ Azure Storage credentials not configured. Set AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY.');
}

/**
 * Get or create blob container client
 */
function getContainerClient(): ContainerClient {
  if (!STORAGE_ACCOUNT_NAME || !STORAGE_ACCOUNT_KEY) {
    throw new Error('Azure Storage is not configured. Check environment variables.');
  }

  const blobServiceClient = new BlobServiceClient(
    `https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
    new StorageSharedKeyCredential(STORAGE_ACCOUNT_NAME, STORAGE_ACCOUNT_KEY)
  );

  return blobServiceClient.getContainerClient(STORAGE_CONTAINER_NAME);
}

/**
 * Ensure container exists (create if needed)
 */
export async function ensureContainer(): Promise<void> {
  const containerClient = getContainerClient();
  await containerClient.createIfNotExists({
    access: 'blob', // Blob-level public read access
  });
}

/**
 * Upload image to blob storage
 * Returns URL with SAS token for temporary access
 */
export async function uploadImage(
  imageData: Buffer | string,
  fileName: string,
  contentType: string = 'image/jpeg'
): Promise<StorageUploadResult> {
  const containerClient = getContainerClient();
  
  // Generate unique blob name with timestamp
  const timestamp = Date.now();
  const blobName = `${timestamp}-${fileName}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  // Convert base64 to buffer if needed
  let buffer: Buffer;
  if (typeof imageData === 'string') {
    // Remove data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    buffer = Buffer.from(base64Data, 'base64');
  } else {
    buffer = imageData;
  }

  // Upload with metadata
  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: {
      blobContentType: contentType,
    },
    metadata: {
      uploadedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + IMAGE_RETENTION_HOURS * 60 * 60 * 1000).toISOString(),
    },
  });

  // Generate SAS token for read access
  const sasToken = generateSasToken(blobName);
  const url = `${blockBlobClient.url}?${sasToken}`;

  return {
    url,
    blobName,
    expiresAt: new Date(Date.now() + SAS_EXPIRY_HOURS * 60 * 60 * 1000),
  };
}

/**
 * Generate SAS token for blob read access
 */
function generateSasToken(blobName: string): string {
  if (!STORAGE_ACCOUNT_NAME || !STORAGE_ACCOUNT_KEY) {
    throw new Error('Storage credentials not available');
  }

  const sharedKeyCredential = new StorageSharedKeyCredential(
    STORAGE_ACCOUNT_NAME,
    STORAGE_ACCOUNT_KEY
  );

  const sasOptions = {
    containerName: STORAGE_CONTAINER_NAME,
    blobName,
    permissions: BlobSASPermissions.parse('r'), // Read only
    startsOn: new Date(),
    expiresOn: new Date(Date.now() + SAS_EXPIRY_HOURS * 60 * 60 * 1000),
  };

  return generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
}

/**
 * Delete blob from storage
 */
export async function deleteImage(blobName: string): Promise<void> {
  const containerClient = getContainerClient();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  await blockBlobClient.deleteIfExists();
}

/**
 * Cleanup expired images (should be run periodically)
 * Returns count of deleted blobs
 */
export async function cleanupExpiredImages(): Promise<number> {
  const containerClient = getContainerClient();
  const now = Date.now();
  let deletedCount = 0;

  // List all blobs
  for await (const blob of containerClient.listBlobsFlat({ includeMetadata: true })) {
    if (blob.metadata?.expiresAt) {
      const expiresAt = new Date(blob.metadata.expiresAt).getTime();
      
      // Delete if expired
      if (expiresAt < now) {
        await deleteImage(blob.name);
        deletedCount++;
      }
    }
  }

  return deletedCount;
}

/**
 * Get blob URL with SAS token (for existing blob)
 */
export async function getBlobUrlWithSas(blobName: string): Promise<string> {
  const containerClient = getContainerClient();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  const sasToken = generateSasToken(blobName);
  return `${blockBlobClient.url}?${sasToken}`;
}

/**
 * Upload base64 image directly
 * Helper function for API routes
 */
export async function uploadBase64Image(
  base64Data: string,
  fileName: string = 'pig-drawing.jpg'
): Promise<StorageUploadResult> {
  // Detect content type from base64 prefix
  const match = base64Data.match(/^data:image\/(\w+);base64,/);
  const contentType = match ? `image/${match[1]}` : 'image/jpeg';
  
  // Convert and validate image buffer (magic bytes) before uploading
  const rawBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  let buffer: Buffer;
  try {
    buffer = Buffer.from(rawBase64, 'base64');
  } catch (err) {
    throw new Error('Invalid base64 image data');
  }

  if (!isValidImageBuffer(buffer)) {
    throw new Error('Uploaded file is not a supported image format');
  }

  return uploadImage(buffer, fileName, contentType);
}

/**
 * Basic magic-bytes validation for common image formats: JPEG, PNG, GIF, WEBP
 */
function isValidImageBuffer(buf: Buffer): boolean {
  if (!buf || buf.length < 8) return false;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;

  // GIF: 'GIF87a' or 'GIF89a'
  if (buf.slice(0, 6).toString('ascii') === 'GIF87a' || buf.slice(0, 6).toString('ascii') === 'GIF89a') return true;

  // WebP: 'RIFF'....'WEBP'
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return true;

  return false;
}

/**
 * Test storage connection
 */
export async function testStorageConnection(): Promise<boolean> {
  try {
    const containerClient = getContainerClient();
    await containerClient.exists();
    return true;
  } catch (error) {
    console.error('Storage connection test failed:', error);
    return false;
  }
}
