/**
 * GET /api/admin/results
 * 
 * Returns all analysis results from storage
 * Used by admin dashboard
 * 
 * Note: Public endpoint for demo purposes. In production, add authentication.
 */

import { NextResponse } from 'next/server';
import { listAllResults } from '@/lib/storage/results';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    const results = await listAllResults();

    return NextResponse.json({
      results,
      count: results.length,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching results:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch results',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
