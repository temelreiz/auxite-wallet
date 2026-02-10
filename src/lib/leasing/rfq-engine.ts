// ============================================
// RFQ ENGINE — Auxite Metal Leasing Engine
// Request for Quote lifecycle: create → distribute → respond → award
// Admin creates RFQ, counterparties respond, admin awards best quote
// ============================================

import { Redis } from '@upstash/redis';
import {
  getCounterparty,
  getAllCounterparties,
  submitQuote,
  type Counterparty,
  type CollateralType,
} from './counterparty-manager';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ============================================
// REDIS KEY NAMESPACE
// ============================================
const KEYS = {
  rfq: (id: string) => `leasing:rfq:${id}`,
  rfqResponses: (id: string) => `leasing:rfq:${id}:responses`,
  activeRfqs: 'leasing:rfq:active',
  allRfqs: 'leasing:rfq:all',
  rfqHistory: 'leasing:rfq:history',
  config: 'leasing:rfq:config',
};

// ============================================
// TYPES
// ============================================
export type RFQStatus = 'draft' | 'open' | 'closed' | 'awarded' | 'expired' | 'cancelled';

export interface RFQRequest {
  id: string;
  // What we're looking for
  metal: string;
  tenor: string;
  tenorDays: number;
  targetSizeOz: number;
  minSizeOz: number;
  maxSizeOz: number;
  // Constraints
  preferredCollateral: CollateralType[];
  maxHaircut: number;              // Maximum acceptable haircut %
  targetRatePercent: number | null; // Target rate (informational, not binding)
  // Distribution
  targetCounterparties: string[];   // Specific CP IDs to send to (empty = all eligible)
  sentToCount: number;
  // Timeline
  responseDeadline: number;
  validityHours: number;           // How long awarded quote should be valid
  // Metadata
  status: RFQStatus;
  createdBy: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
  closedAt: number | null;
  awardedAt: number | null;
  awardedResponseId: string | null;
}

export interface RFQResponse {
  id: string;
  rfqId: string;
  counterpartyId: string;
  counterpartyName: string;
  // Offered terms
  ratePercent: number;
  minSizeOz: number;
  maxSizeOz: number;
  collateralType: CollateralType;
  haircut: number;
  validUntil: number;
  // Status
  status: 'submitted' | 'awarded' | 'rejected' | 'expired';
  // Metadata
  submittedAt: number;
  notes: string;
}

export interface RFQConfig {
  defaultResponseWindowHours: number;
  defaultValidityHours: number;
  autoCloseEnabled: boolean;       // Auto-close RFQ when deadline passes
  minResponses: number;            // Min responses before allowing award
  maxActiveRfqs: number;
}

// ============================================
// DEFAULT CONFIG
// ============================================
const DEFAULT_CONFIG: RFQConfig = {
  defaultResponseWindowHours: 24,
  defaultValidityHours: 48,
  autoCloseEnabled: true,
  minResponses: 1,
  maxActiveRfqs: 10,
};

const TENOR_DAYS: Record<string, number> = {
  '3M': 90,
  '6M': 180,
  '12M': 365,
};

// ============================================
// CONFIG
// ============================================
export async function getRFQConfig(): Promise<RFQConfig> {
  try {
    const raw = await redis.get(KEYS.config);
    if (raw && typeof raw === 'object') {
      return { ...DEFAULT_CONFIG, ...(raw as Partial<RFQConfig>) };
    }
  } catch (e) {
    console.warn('Failed to fetch RFQ config, using defaults', e);
  }
  return DEFAULT_CONFIG;
}

export async function setRFQConfig(config: Partial<RFQConfig>): Promise<RFQConfig> {
  const current = await getRFQConfig();
  const merged = { ...current, ...config };
  await redis.set(KEYS.config, merged);
  return merged;
}

// ============================================
// CREATE RFQ
// ============================================
export async function createRFQ(
  data: Omit<RFQRequest, 'id' | 'status' | 'sentToCount' | 'createdAt' | 'updatedAt' | 'closedAt' | 'awardedAt' | 'awardedResponseId'>
): Promise<RFQRequest> {
  const now = Date.now();
  const id = `RFQ-${data.metal}-${data.tenor}-${now.toString(36)}`;

  const rfq: RFQRequest = {
    ...data,
    id,
    tenorDays: TENOR_DAYS[data.tenor.toUpperCase()] || 180,
    status: 'draft',
    sentToCount: 0,
    createdAt: now,
    updatedAt: now,
    closedAt: null,
    awardedAt: null,
    awardedResponseId: null,
  };

  await Promise.all([
    redis.set(KEYS.rfq(id), rfq),
    redis.sadd(KEYS.allRfqs, id),
  ]);

  return rfq;
}

// ============================================
// OPEN RFQ (distribute to counterparties)
// ============================================
export async function openRFQ(rfqId: string): Promise<{ success: boolean; sentTo: string[]; error?: string }> {
  const rfq = await getRFQ(rfqId);
  if (!rfq) return { success: false, sentTo: [], error: 'RFQ not found' };

  if (rfq.status !== 'draft') {
    return { success: false, sentTo: [], error: `RFQ must be in draft state (current: ${rfq.status})` };
  }

  // Determine target counterparties
  let targets: Counterparty[] = [];

  if (rfq.targetCounterparties && rfq.targetCounterparties.length > 0) {
    // Specific counterparties
    for (const cpId of rfq.targetCounterparties) {
      const cp = await getCounterparty(cpId);
      if (cp && cp.active && cp.metals.includes(rfq.metal.toUpperCase())) {
        targets.push(cp);
      }
    }
  } else {
    // All eligible counterparties
    const all = await getAllCounterparties();
    targets = all.filter((cp) => cp.active && cp.metals.includes(rfq.metal.toUpperCase()));
  }

  if (targets.length === 0) {
    return { success: false, sentTo: [], error: 'No eligible counterparties found' };
  }

  // Update RFQ status
  rfq.status = 'open';
  rfq.sentToCount = targets.length;
  rfq.updatedAt = Date.now();

  await redis.set(KEYS.rfq(rfqId), rfq);
  await redis.sadd(KEYS.activeRfqs, rfqId);

  // In production, this would trigger notifications (email, API webhook)
  // For now, counterparties are notified through the admin dashboard

  return {
    success: true,
    sentTo: targets.map((t) => t.name),
  };
}

// ============================================
// SUBMIT RFQ RESPONSE
// ============================================
export async function submitRFQResponse(
  rfqId: string,
  data: Omit<RFQResponse, 'id' | 'rfqId' | 'status' | 'submittedAt'>
): Promise<{ success: boolean; response?: RFQResponse; error?: string }> {
  const rfq = await getRFQ(rfqId);
  if (!rfq) return { success: false, error: 'RFQ not found' };

  if (rfq.status !== 'open') {
    return { success: false, error: `RFQ is not accepting responses (status: ${rfq.status})` };
  }

  // Check deadline
  if (Date.now() > rfq.responseDeadline) {
    // Auto-close
    await closeRFQ(rfqId);
    return { success: false, error: 'RFQ response deadline has passed' };
  }

  // Validate counterparty
  const cp = await getCounterparty(data.counterpartyId);
  if (!cp || !cp.active) {
    return { success: false, error: 'Invalid or inactive counterparty' };
  }

  const now = Date.now();
  const id = `RFQR-${rfqId}-${data.counterpartyId.split('-')[1] || 'UNK'}-${now.toString(36)}`;

  const response: RFQResponse = {
    ...data,
    id,
    rfqId,
    status: 'submitted',
    submittedAt: now,
  };

  await redis.lpush(KEYS.rfqResponses(rfqId), JSON.stringify(response));

  return { success: true, response };
}

// ============================================
// CLOSE RFQ (stop accepting responses)
// ============================================
export async function closeRFQ(rfqId: string): Promise<{ success: boolean; error?: string }> {
  const rfq = await getRFQ(rfqId);
  if (!rfq) return { success: false, error: 'RFQ not found' };

  if (rfq.status !== 'open') {
    return { success: false, error: `Cannot close RFQ in ${rfq.status} state` };
  }

  rfq.status = 'closed';
  rfq.closedAt = Date.now();
  rfq.updatedAt = Date.now();

  await redis.set(KEYS.rfq(rfqId), rfq);
  await redis.srem(KEYS.activeRfqs, rfqId);

  return { success: true };
}

// ============================================
// AWARD RFQ (select winning response + create quote)
// ============================================
export async function awardRFQ(
  rfqId: string,
  responseId: string
): Promise<{ success: boolean; error?: string }> {
  const rfq = await getRFQ(rfqId);
  if (!rfq) return { success: false, error: 'RFQ not found' };

  if (rfq.status !== 'open' && rfq.status !== 'closed') {
    return { success: false, error: `Cannot award RFQ in ${rfq.status} state` };
  }

  // Find the response
  const responses = await getRFQResponses(rfqId);
  const winner = responses.find((r) => r.id === responseId);
  if (!winner) return { success: false, error: 'Response not found' };

  if (winner.status !== 'submitted') {
    return { success: false, error: `Response is not in submitted state (current: ${winner.status})` };
  }

  const now = Date.now();
  const config = await getRFQConfig();
  const validUntil = winner.validUntil || (now + config.defaultValidityHours * 60 * 60 * 1000);

  // Create a live quote from the winning response
  await submitQuote({
    counterpartyId: winner.counterpartyId,
    counterpartyName: winner.counterpartyName,
    metal: rfq.metal,
    tenor: rfq.tenor,
    tenorDays: rfq.tenorDays,
    ratePercent: winner.ratePercent,
    validUntil,
    minSizeOz: winner.minSizeOz,
    maxSizeOz: winner.maxSizeOz,
    collateralType: winner.collateralType,
    haircut: winner.haircut,
    createdBy: rfq.createdBy,
    source: 'rfq_response',
  });

  // Update RFQ
  rfq.status = 'awarded';
  rfq.awardedAt = now;
  rfq.awardedResponseId = responseId;
  rfq.updatedAt = now;

  // Mark winner and reject others
  const updatedResponses: RFQResponse[] = responses.map((r) => ({
    ...r,
    status: r.id === responseId ? 'awarded' as const : 'rejected' as const,
  }));

  // Rebuild responses in Redis
  await redis.del(KEYS.rfqResponses(rfqId));
  for (const resp of updatedResponses) {
    await redis.rpush(KEYS.rfqResponses(rfqId), JSON.stringify(resp));
  }

  await redis.set(KEYS.rfq(rfqId), rfq);
  await redis.srem(KEYS.activeRfqs, rfqId);

  // Add to history
  await redis.lpush(KEYS.rfqHistory, JSON.stringify({
    rfqId: rfq.id,
    metal: rfq.metal,
    tenor: rfq.tenor,
    targetSizeOz: rfq.targetSizeOz,
    awardedTo: winner.counterpartyName,
    awardedRate: winner.ratePercent,
    responsesReceived: responses.length,
    awardedAt: now,
  }));
  await redis.ltrim(KEYS.rfqHistory, 0, 199);

  return { success: true };
}

// ============================================
// CANCEL RFQ
// ============================================
export async function cancelRFQ(rfqId: string): Promise<{ success: boolean; error?: string }> {
  const rfq = await getRFQ(rfqId);
  if (!rfq) return { success: false, error: 'RFQ not found' };

  if (rfq.status === 'awarded' || rfq.status === 'cancelled') {
    return { success: false, error: `Cannot cancel RFQ in ${rfq.status} state` };
  }

  rfq.status = 'cancelled';
  rfq.updatedAt = Date.now();

  await redis.set(KEYS.rfq(rfqId), rfq);
  await redis.srem(KEYS.activeRfqs, rfqId);

  return { success: true };
}

// ============================================
// QUERY FUNCTIONS
// ============================================
export async function getRFQ(rfqId: string): Promise<RFQRequest | null> {
  try {
    const raw = await redis.get(KEYS.rfq(rfqId));
    if (raw && typeof raw === 'object') return raw as RFQRequest;
  } catch (e) {
    console.warn(`Failed to fetch RFQ ${rfqId}`, e);
  }
  return null;
}

export async function getRFQResponses(rfqId: string): Promise<RFQResponse[]> {
  try {
    const raw = await redis.lrange(KEYS.rfqResponses(rfqId), 0, -1);
    if (!raw || raw.length === 0) return [];

    return raw.map((item) => {
      if (typeof item === 'string') return JSON.parse(item) as RFQResponse;
      return item as RFQResponse;
    });
  } catch (e) {
    console.warn(`Failed to fetch RFQ responses for ${rfqId}`, e);
    return [];
  }
}

export async function getActiveRFQs(): Promise<RFQRequest[]> {
  try {
    const ids = await redis.smembers(KEYS.activeRfqs);
    if (!ids || ids.length === 0) return [];

    const rfqs: RFQRequest[] = [];
    for (const id of ids) {
      const rfq = await getRFQ(id as string);
      if (rfq) rfqs.push(rfq);
    }

    return rfqs.sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.warn('Failed to fetch active RFQs', e);
    return [];
  }
}

export async function getAllRFQs(): Promise<RFQRequest[]> {
  try {
    const ids = await redis.smembers(KEYS.allRfqs);
    if (!ids || ids.length === 0) return [];

    const rfqs: RFQRequest[] = [];
    for (const id of ids) {
      const rfq = await getRFQ(id as string);
      if (rfq) rfqs.push(rfq);
    }

    return rfqs.sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.warn('Failed to fetch all RFQs', e);
    return [];
  }
}

export async function getRFQSummary(): Promise<{
  active: number;
  awarded: number;
  expired: number;
  totalResponsesReceived: number;
  avgResponseRate: number;
}> {
  const all = await getAllRFQs();

  let totalResponses = 0;
  let totalSent = 0;

  const summary = {
    active: 0,
    awarded: 0,
    expired: 0,
    totalResponsesReceived: 0,
    avgResponseRate: 0,
  };

  for (const rfq of all) {
    if (rfq.status === 'open') summary.active++;
    else if (rfq.status === 'awarded') summary.awarded++;
    else if (rfq.status === 'expired') summary.expired++;

    totalSent += rfq.sentToCount;
    const responses = await getRFQResponses(rfq.id);
    totalResponses += responses.length;
  }

  summary.totalResponsesReceived = totalResponses;
  summary.avgResponseRate = totalSent > 0 ? parseFloat(((totalResponses / totalSent) * 100).toFixed(1)) : 0;

  return summary;
}

// ============================================
// AUTO-EXPIRE STALE RFQs
// ============================================
export async function expireStaleRFQs(): Promise<number> {
  const active = await getActiveRFQs();
  const now = Date.now();
  let expiredCount = 0;

  for (const rfq of active) {
    if (now > rfq.responseDeadline) {
      rfq.status = 'expired';
      rfq.updatedAt = now;
      await redis.set(KEYS.rfq(rfq.id), rfq);
      await redis.srem(KEYS.activeRfqs, rfq.id);
      expiredCount++;
    }
  }

  return expiredCount;
}

export async function getRFQHistory(limit: number = 50): Promise<any[]> {
  try {
    const raw = await redis.lrange(KEYS.rfqHistory, 0, limit - 1);
    if (!raw || raw.length === 0) return [];

    return raw.map((item) => {
      if (typeof item === 'string') return JSON.parse(item);
      return item;
    });
  } catch (e) {
    console.warn('Failed to fetch RFQ history', e);
    return [];
  }
}
