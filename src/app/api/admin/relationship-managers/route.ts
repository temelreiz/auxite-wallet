// ============================================
// ADMIN — Relationship Manager CRUD API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllManagersWithLoad,
  createManager,
  updateManager,
  deleteManager,
  manualAssignRM,
  reassignAllClients,
  getClientsForRM,
  getActivity,
  getUnassignedUserCount,
} from '@/lib/relationship-manager';
import { requireAdmin } from '@/lib/admin-auth';

// ── GET: List all RMs with load stats ──
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    const { searchParams } = new URL(request.url);
    const rmId = searchParams.get('id');

    if (rmId) {
      // Get specific RM with clients
      const managers = await getAllManagersWithLoad();
      const rm = managers.find(m => m.id === rmId);
      if (!rm) {
        return NextResponse.json({ error: 'Relationship manager not found' }, { status: 404 });
      }
      const clients = await getClientsForRM(rmId);
      const activity = await getActivity(rmId, 20);
      return NextResponse.json({
        success: true,
        manager: rm,
        clients,
        activity,
      });
    }

    // List all RMs
    const managers = await getAllManagersWithLoad();
    const unassigned = await getUnassignedUserCount();
    const totalClients = managers.reduce((sum, m) => sum + m.currentLoad, 0);

    return NextResponse.json({
      success: true,
      managers,
      stats: {
        totalManagers: managers.length,
        activeManagers: managers.filter(m => m.status === 'active').length,
        totalClients,
        unassignedUsers: unassigned,
        averageLoad: managers.length > 0 ? Math.round(totalClients / managers.length) : 0,
      },
    });
  } catch (error: any) {
    console.error('RM API GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch RMs' }, { status: 500 });
  }
}

// ── POST: Create / Update / Delete / Assign ──
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'create': {
        const { name, title, email, phone, whatsapp, photoUrl, capacity, languages, specializations } = body;
        if (!name || !email || !title) {
          return NextResponse.json({ error: 'Name, title, and email are required' }, { status: 400 });
        }
        const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
        const rm = await createManager({
          name,
          title: title || 'Relationship Manager',
          email,
          phone: phone || '',
          whatsapp: whatsapp || phone || '',
          photoUrl: photoUrl || '',
          initials,
          status: 'active',
          capacity: capacity || 100,
          languages: languages || ['en'],
          specializations: specializations || [],
        });
        return NextResponse.json({ success: true, manager: rm });
      }

      case 'update': {
        const { id, ...updates } = body;
        if (!id) return NextResponse.json({ error: 'Manager ID required' }, { status: 400 });
        // Recalculate initials if name changed
        if (updates.name) {
          updates.initials = updates.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
        }
        delete updates.action;
        const updated = await updateManager(id, updates);
        if (!updated) return NextResponse.json({ error: 'Manager not found' }, { status: 404 });
        return NextResponse.json({ success: true, manager: updated });
      }

      case 'deactivate': {
        const { id } = body;
        if (!id) return NextResponse.json({ error: 'Manager ID required' }, { status: 400 });
        const updated = await updateManager(id, { status: 'inactive' });
        if (!updated) return NextResponse.json({ error: 'Manager not found' }, { status: 404 });
        // Reassign all their clients
        const reassigned = await reassignAllClients(id);
        return NextResponse.json({ success: true, manager: updated, reassignedClients: reassigned });
      }

      case 'delete': {
        const { id } = body;
        if (!id) return NextResponse.json({ error: 'Manager ID required' }, { status: 400 });
        const deleted = await deleteManager(id);
        if (!deleted) return NextResponse.json({ error: 'Manager not found' }, { status: 404 });
        return NextResponse.json({ success: true, deleted: true });
      }

      case 'assign': {
        const { address, rmId } = body;
        if (!address || !rmId) return NextResponse.json({ error: 'Address and rmId required' }, { status: 400 });
        const success = await manualAssignRM(address, rmId);
        if (!success) return NextResponse.json({ error: 'Assignment failed' }, { status: 400 });
        return NextResponse.json({ success: true });
      }

      case 'reassign_all': {
        const { fromRmId, toRmId } = body;
        if (!fromRmId) return NextResponse.json({ error: 'fromRmId required' }, { status: 400 });
        const count = await reassignAllClients(fromRmId, toRmId);
        return NextResponse.json({ success: true, reassigned: count });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('RM API POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process request' }, { status: 500 });
  }
}
