// ============================================
// RELATIONSHIP MANAGER — CRM Core Library
// Types, auto-assignment, helpers
// ============================================

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ── Types ──

export interface RelationshipManager {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  whatsapp: string;
  photoUrl: string;
  initials: string;
  status: 'active' | 'inactive' | 'on_leave';
  capacity: number;
  languages: string[];
  specializations: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RMWithLoad extends RelationshipManager {
  currentLoad: number;
  utilization: number; // currentLoad / capacity as percentage
}

export interface RMPublicInfo {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  whatsapp: string;
  photoUrl: string;
  initials: string;
  status: string;
  available: boolean;
  languages: string[];
}

// ── Redis Keys ──

const KEYS = {
  managers: 'rm:managers',
  assignment: (address: string) => `rm:assignment:${address.toLowerCase()}`,
  clients: (rmId: string) => `rm:clients:${rmId}`,
  activity: (rmId: string) => `rm:activity:${rmId}`,
};

// ── Manager CRUD ──

export async function getAllManagers(): Promise<RelationshipManager[]> {
  const data = await redis.get(KEYS.managers);
  if (!data) return [];
  return typeof data === 'string' ? JSON.parse(data) : (data as RelationshipManager[]);
}

export async function getAllManagersWithLoad(): Promise<RMWithLoad[]> {
  const managers = await getAllManagers();
  const results: RMWithLoad[] = [];

  for (const rm of managers) {
    const count = await redis.scard(KEYS.clients(rm.id));
    results.push({
      ...rm,
      currentLoad: count,
      utilization: rm.capacity > 0 ? Math.round((count / rm.capacity) * 100) : 0,
    });
  }

  return results;
}

export async function getManagerById(id: string): Promise<RelationshipManager | null> {
  const managers = await getAllManagers();
  return managers.find(m => m.id === id) || null;
}

export async function saveManagers(managers: RelationshipManager[]): Promise<void> {
  await redis.set(KEYS.managers, JSON.stringify(managers));
}

export async function createManager(data: Omit<RelationshipManager, 'id' | 'createdAt' | 'updatedAt'>): Promise<RelationshipManager> {
  const managers = await getAllManagers();
  const newRM: RelationshipManager = {
    ...data,
    id: `rm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  managers.push(newRM);
  await saveManagers(managers);
  return newRM;
}

export async function updateManager(id: string, updates: Partial<RelationshipManager>): Promise<RelationshipManager | null> {
  const managers = await getAllManagers();
  const index = managers.findIndex(m => m.id === id);
  if (index === -1) return null;

  managers[index] = {
    ...managers[index],
    ...updates,
    id: managers[index].id, // prevent ID change
    createdAt: managers[index].createdAt, // prevent creation date change
    updatedAt: new Date().toISOString(),
  };
  await saveManagers(managers);
  return managers[index];
}

export async function deleteManager(id: string): Promise<boolean> {
  const managers = await getAllManagers();
  const index = managers.findIndex(m => m.id === id);
  if (index === -1) return false;

  // Reassign all clients before deletion
  await reassignAllClients(id);

  // Remove from list
  managers.splice(index, 1);
  await saveManagers(managers);

  // Cleanup Redis keys
  await redis.del(KEYS.clients(id));
  await redis.del(KEYS.activity(id));

  return true;
}

// ── Assignment Logic ──

export async function getAssignedRM(address: string): Promise<RMPublicInfo | null> {
  let rmId = await redis.get(KEYS.assignment(address)) as string | null;

  // Lazy assignment: if not assigned, auto-assign now
  if (!rmId) {
    rmId = await autoAssignRM(address);
    if (!rmId) return null;
  }

  const rm = await getManagerById(rmId);
  if (!rm) return null;

  // If assigned RM is inactive, reassign
  if (rm.status !== 'active') {
    const newRmId = await autoAssignRM(address);
    if (!newRmId) return null;
    const newRm = await getManagerById(newRmId);
    if (!newRm) return null;
    return toPublicInfo(newRm);
  }

  return toPublicInfo(rm);
}

export async function autoAssignRM(address: string): Promise<string | null> {
  const managers = await getAllManagers();
  const activeManagers = managers.filter(m => m.status === 'active');

  if (activeManagers.length === 0) return null;

  // Get load for each active RM
  const withLoad: { rm: RelationshipManager; load: number; ratio: number }[] = [];
  for (const rm of activeManagers) {
    const load = await redis.scard(KEYS.clients(rm.id));
    withLoad.push({
      rm,
      load,
      ratio: rm.capacity > 0 ? load / rm.capacity : Infinity,
    });
  }

  // Sort by utilization ratio (lowest first)
  withLoad.sort((a, b) => a.ratio - b.ratio);
  const chosen = withLoad[0].rm;

  // Remove from previous assignment if any
  const prevRmId = await redis.get(KEYS.assignment(address)) as string | null;
  if (prevRmId) {
    await redis.srem(KEYS.clients(prevRmId), address.toLowerCase());
  }

  // Assign
  await redis.set(KEYS.assignment(address), chosen.id);
  await redis.sadd(KEYS.clients(chosen.id), address.toLowerCase());

  // Log activity
  await logActivity(chosen.id, {
    type: 'client_assigned',
    address: address.toLowerCase(),
    timestamp: Date.now(),
  });

  return chosen.id;
}

export async function manualAssignRM(address: string, rmId: string): Promise<boolean> {
  const rm = await getManagerById(rmId);
  if (!rm) return false;

  // Remove from previous assignment
  const prevRmId = await redis.get(KEYS.assignment(address)) as string | null;
  if (prevRmId) {
    await redis.srem(KEYS.clients(prevRmId), address.toLowerCase());
  }

  // Assign new
  await redis.set(KEYS.assignment(address), rmId);
  await redis.sadd(KEYS.clients(rmId), address.toLowerCase());

  await logActivity(rmId, {
    type: 'client_manually_assigned',
    address: address.toLowerCase(),
    timestamp: Date.now(),
  });

  return true;
}

export async function reassignAllClients(fromRmId: string, toRmId?: string): Promise<number> {
  const clients = await redis.smembers(KEYS.clients(fromRmId));
  if (clients.length === 0) return 0;

  let reassigned = 0;
  for (const client of clients) {
    if (toRmId) {
      await manualAssignRM(client, toRmId);
    } else {
      // Remove current assignment so autoAssign picks a new RM
      await redis.del(KEYS.assignment(client));
      await redis.srem(KEYS.clients(fromRmId), client);
      await autoAssignRM(client);
    }
    reassigned++;
  }

  return reassigned;
}

export async function getClientsForRM(rmId: string): Promise<string[]> {
  return await redis.smembers(KEYS.clients(rmId));
}

// ── Activity Logging ──

async function logActivity(rmId: string, entry: Record<string, any>): Promise<void> {
  try {
    await redis.lpush(KEYS.activity(rmId), JSON.stringify(entry));
    await redis.ltrim(KEYS.activity(rmId), 0, 99);
  } catch {
    // Non-blocking
  }
}

export async function getActivity(rmId: string, limit = 20): Promise<any[]> {
  const raw = await redis.lrange(KEYS.activity(rmId), 0, limit - 1);
  return raw.map(r => {
    try { return typeof r === 'string' ? JSON.parse(r) : r; }
    catch { return null; }
  }).filter(Boolean);
}

// ── Helpers ──

function toPublicInfo(rm: RelationshipManager): RMPublicInfo {
  return {
    id: rm.id,
    name: rm.name,
    title: rm.title,
    email: rm.email,
    phone: rm.phone,
    whatsapp: rm.whatsapp,
    photoUrl: rm.photoUrl,
    initials: rm.initials,
    status: rm.status,
    available: rm.status === 'active',
    languages: rm.languages,
  };
}

export async function getUnassignedUserCount(): Promise<number> {
  // This is an estimate — we check a sample of recent users
  // Full scan would be expensive on Redis
  try {
    const allUsers = await redis.keys('user:*:balance');
    let unassigned = 0;
    for (const userKey of allUsers.slice(0, 500)) {
      const address = userKey.replace('user:', '').replace(':balance', '');
      if (address.startsWith('0x')) {
        const rmId = await redis.get(KEYS.assignment(address));
        if (!rmId) unassigned++;
      }
    }
    return unassigned;
  } catch {
    return 0;
  }
}
