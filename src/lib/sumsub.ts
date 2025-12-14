/**
 * Sumsub KYC Integration
 */

import crypto from 'crypto';

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN || '';
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY || '';
const SUMSUB_BASE_URL = process.env.SUMSUB_BASE_URL || 'https://api.sumsub.com';

// Sadece token ve secret yoksa test mode
const IS_TEST = !SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY;

function createSignature(ts: number, method: string, path: string, body?: string): string {
  const data = ts + method.toUpperCase() + path + (body || '');
  return crypto.createHmac('sha256', SUMSUB_SECRET_KEY).update(data).digest('hex');
}

async function sumsubRequest(method: string, path: string, body?: any): Promise<any> {
  const ts = Math.floor(Date.now() / 1000);
  const bodyStr = body ? JSON.stringify(body) : '';
  const signature = createSignature(ts, method, path, bodyStr);

  console.log('Sumsub request:', method, path);

  const response = await fetch(SUMSUB_BASE_URL + path, {
    method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-App-Token': SUMSUB_APP_TOKEN,
      'X-App-Access-Ts': ts.toString(),
      'X-App-Access-Sig': signature,
    },
    body: body ? bodyStr : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Sumsub error:', response.status, error);
    throw new Error(`Sumsub API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function createApplicant(externalUserId: string, email?: string, phone?: string): Promise<any> {
  if (IS_TEST) {
    console.log('Sumsub TEST MODE - createApplicant');
    return { id: 'test_' + externalUserId, createdAt: new Date().toISOString(), externalUserId, email, phone };
  }
  return sumsubRequest('POST', '/resources/applicants?levelName=basic-kyc-level', { externalUserId, email, phone });
}

export async function createAccessToken(externalUserId: string, levelName: string = 'basic-kyc-level'): Promise<string> {
  if (IS_TEST) {
    console.log('Sumsub TEST MODE - createAccessToken');
    return 'test_token_' + externalUserId + '_' + Date.now();
  }
  const result = await sumsubRequest('POST', `/resources/accessTokens?userId=${externalUserId}&levelName=${levelName}`);
  return result.token;
}

export async function getApplicantStatus(applicantId: string): Promise<any> {
  if (IS_TEST) {
    return { id: applicantId, reviewStatus: 'pending', reviewResult: null };
  }
  return sumsubRequest('GET', `/resources/applicants/${applicantId}/status`);
}

export async function getApplicant(applicantId: string): Promise<any> {
  if (IS_TEST) {
    return { id: applicantId, createdAt: new Date().toISOString(), info: {}, review: { reviewStatus: 'pending' } };
  }
  return sumsubRequest('GET', `/resources/applicants/${applicantId}/one`);
}

export async function getApplicantByExternalId(externalUserId: string): Promise<any> {
  if (IS_TEST) {
    return null;
  }
  try {
    return await sumsubRequest('GET', `/resources/applicants/-;externalUserId=${externalUserId}/one`);
  } catch {
    return null;
  }
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const expectedSignature = crypto.createHmac('sha256', SUMSUB_SECRET_KEY).update(payload).digest('hex');
  return signature === expectedSignature;
}

export function mapReviewStatusToLevel(reviewResult: any): 'none' | 'basic' | 'verified' | 'enhanced' {
  if (!reviewResult) return 'none';
  if (reviewResult.reviewAnswer === 'GREEN') return 'verified';
  return 'none';
}

export function mapReviewStatusToKYCStatus(reviewStatus: string, reviewResult?: any): string {
  switch (reviewStatus) {
    case 'init':
    case 'pending': return 'pending';
    case 'queued':
    case 'onHold': return 'under_review';
    case 'completed':
      if (reviewResult?.reviewAnswer === 'GREEN') return 'approved';
      if (reviewResult?.reviewAnswer === 'RED') return 'rejected';
      return 'under_review';
    default: return 'pending';
  }
}
