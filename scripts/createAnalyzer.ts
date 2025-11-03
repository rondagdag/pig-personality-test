#!/usr/bin/env node
/**
 * CLI script to create/update the custom pig-feature-analyzer in Azure Content Understanding.
 * 
 * Usage:
 *   npm run create-analyzer          # Interactive with confirmation
 *   npm run create-analyzer -- --yes # Skip confirmation (CI/automation)
 * 
 * Prerequisites:
 *   - CONTENT_UNDERSTANDING_ENDPOINT and CONTENT_UNDERSTANDING_KEY must be set in .env.local
 *   - Your Azure subscription must have permissions to create/update analyzers
 * 
 * This is typically a one-time setup operation. After the analyzer is created,
 * you can use it by calling analyzeImage() which will automatically use the
 * custom analyzer outputs if they're present in the response.
 */

// IMPORTANT: Load environment variables BEFORE importing any modules that use process.env
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as readline from 'readline';
import { createCustomAnalyzer, getCustomAnalyzerDefinition } from '../lib/azure/content-understanding';

const SKIP_CONFIRMATION = process.argv.includes('--yes') || process.argv.includes('-y');

async function confirm(question: string): Promise<boolean> {
  if (SKIP_CONFIRMATION) {
    return true;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  console.log('🚀 Azure Content Understanding Custom Analyzer Setup\n');

  // Check environment variables
  if (!process.env.CONTENT_UNDERSTANDING_ENDPOINT || !process.env.CONTENT_UNDERSTANDING_KEY) {
    console.error('❌ Error: Azure Content Understanding credentials not configured.');
    console.error('   Please set the following environment variables:');
    console.error('   - CONTENT_UNDERSTANDING_ENDPOINT');
    console.error('   - CONTENT_UNDERSTANDING_KEY\n');
    process.exit(1);
  }

  console.log('✅ Azure credentials found');
  console.log(`📍 Endpoint: ${process.env.CONTENT_UNDERSTANDING_ENDPOINT}\n`);

  // Show analyzer definition
  const definition = getCustomAnalyzerDefinition();
  console.log('📋 Analyzer Definition:');
  console.log(`   Base Analyzer: ${definition.baseAnalyzerId}`);
  console.log(`   Description: ${definition.description}`);
  console.log('   Custom Fields:');
  Object.entries(definition.fieldSchema.fields).forEach(([fieldName, fieldDef]: [string, any]) => {
    console.log(`     - ${fieldName} (${fieldDef.type}): ${fieldDef.description}`);
  });
  console.log('');

  // Confirmation prompt
  const proceed = await confirm('Do you want to create/update this custom analyzer in Azure?');
  
  if (!proceed) {
    console.log('❌ Operation cancelled by user.');
    process.exit(0);
  }

  console.log('\n⏳ Creating custom analyzer...');

  try {
    const success = await createCustomAnalyzer();

    if (success) {
      console.log('\n✅ Success! Custom analyzer is ready.');
      console.log('\n📝 Next steps:');
      console.log('   1. The analyzer is now registered in your Azure Content Understanding service');
      console.log('   2. Use analyzeImage() in your app - it will automatically detect and use custom fields');
      console.log('   3. Test with: npm test\n');
      process.exit(0);
    } else {
      console.error('\n❌ Failed to create analyzer. Check the error messages above.');
      console.error('   Common issues:');
      console.error('   - Insufficient permissions on the Azure resource');
      console.error('   - Invalid analyzer definition format');
      console.error('   - API version mismatch\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error creating analyzer:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
