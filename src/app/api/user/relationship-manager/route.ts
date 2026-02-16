// ============================================
// USER — Get Assigned Relationship Manager
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getAssignedRM } from '@/lib/relationship-manager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    const manager = await getAssignedRM(address);

    if (!manager) {
      return NextResponse.json({
        success: true,
        manager: null,
        message: 'No relationship manager assigned yet. One will be assigned upon your next interaction.',
      });
    }

    return NextResponse.json({
      success: true,
      manager,
    });
  } catch (error: any) {
    console.error('User RM API error:', error);
    return NextResponse.json({ error: 'Failed to fetch relationship manager' }, { status: 500 });
  }
}
