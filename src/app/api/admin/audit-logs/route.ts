// Admin Audit Logs API
import { NextRequest, NextResponse } from 'next/server';
import { getGlobalAuditLogs, getHighRiskLogs, AuditLog, RiskLevel, AuditAction } from '@/lib/security/audit-logger';

// GET - Get audit logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const action = searchParams.get('action') as AuditAction | null;
    const limit = parseInt(searchParams.get('limit') || '100');

    let logs: AuditLog[];

    if (filter === 'high' || filter === 'critical') {
      logs = await getHighRiskLogs(limit);
      if (filter === 'critical') {
        logs = logs.filter(log => log.risk === 'critical');
      }
    } else {
      // 'all' için risk filter geçme
      const riskFilter = ['low', 'medium', 'high', 'critical'].includes(filter) 
        ? filter as RiskLevel 
        : undefined;
        
      logs = await getGlobalAuditLogs(limit, { 
        action: action || undefined,
        risk: riskFilter
      });
    }

    return NextResponse.json({
      success: true,
      count: logs.length,
      logs,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Clear old logs
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Log cleanup is disabled in production',
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
