/**
 * GET /api/admin/results
 * 
 * Returns all analysis results from storage
 * Used by admin dashboard
 */

import { NextResponse } from 'next/server';
import { listAllResults } from '@/lib/storage/results';

// Admin API key (set this in environment variables for production)
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Simple API Key authentication to protect admin endpoints.
  // Expect header: x-admin-api-key: <key> or Authorization: Bearer <key>
  const providedKey = request.headers.get('x-admin-api-key') || request.headers.get('authorization')?.split(' ')[1];

  if (!ADMIN_API_KEY) {
    console.error('Admin endpoint attempted to be accessed but ADMIN_API_KEY is not configured.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!providedKey || providedKey !== ADMIN_API_KEY) {
    console.warn('Unauthorized admin access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
