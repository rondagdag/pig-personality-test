/**
 * Test script to verify Azure Content Understanding and Storage connectivity
 * Run with: NODE_OPTIONS='--loader ts-node/esm' npx tsx test-azure-connection.ts
 */

// Load environment variables FIRST before any imports
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });

// Now import after env vars are loaded
import { testConnection } from './lib/azure/content-understanding';
import { testStorageConnection, ensureContainer, uploadBase64Image } from './lib/storage/blob';

async function main() {
  // Debug: Log environment variables status
  console.log('📝 Environment check:');
  console.log(`   AZURE_STORAGE_ACCOUNT_NAME: ${process.env.AZURE_STORAGE_ACCOUNT_NAME ? '✓' : '✗'}`);
  console.log(`   CONTENT_UNDERSTANDING_ENDPOINT: ${process.env.CONTENT_UNDERSTANDING_ENDPOINT ? '✓' : '✗'}\n`);
  console.log('🧪 Testing Azure connections...\n');

  // Test 1: Storage Connection
  console.log('1️⃣ Testing Azure Storage connection...');
  const storageConnected = await testStorageConnection();
  console.log(`   ${storageConnected ? '✅' : '❌'} Storage: ${storageConnected ? 'Connected' : 'Failed'}\n`);

  if (!storageConnected) {
    console.error('❌ Storage connection failed. Check AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY');
    process.exit(1);
  }

  // Test 2: Ensure Container Exists
  console.log('2️⃣ Ensuring pig-images container exists...');
  try {
    await ensureContainer();
    console.log('   ✅ Container ready\n');
  } catch (error: any) {
    console.error('   ❌ Container creation failed:', error.message);
    process.exit(1);
  }

  // Test 3: Upload Test Image
  console.log('3️⃣ Uploading test image...');
  const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  try {
    const uploadResult = await uploadBase64Image(testImageBase64, 'test-image.png');
    console.log('   ✅ Image uploaded successfully');
    console.log(`   📎 URL: ${uploadResult.url.substring(0, 100)}...\n`);

    // Test 4: Content Understanding Connection
    console.log('4️⃣ Testing Azure Content Understanding connection...');
    const cuConnected = await testConnection();
    console.log(`   ${cuConnected ? '✅' : '❌'} Content Understanding: ${cuConnected ? 'Connected' : 'Failed'}\n`);

    if (!cuConnected) {
      console.error('❌ Content Understanding connection failed. Check CONTENT_UNDERSTANDING_ENDPOINT and CONTENT_UNDERSTANDING_KEY');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('   ❌ Upload failed:', error.message);
    process.exit(1);
  }

  console.log('✅ All Azure connections are working!\n');
}

main().catch(console.error);
