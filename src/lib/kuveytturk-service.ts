// ============================================
// KUVEYTTÜRK API SERVICE
// ============================================
// Precious Metal Rates + Buy/Sell via KuveytTürk API Market
// Base URL: https://prep-gateway.kuveytturk.com.tr (sandbox)
// Auth: OAuth 2.0 Client Credentials + RSA-SHA256 Signature
// ============================================

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// TYPES
// ============================================

export interface KuveytTurkToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  obtained_at: number;
}

export interface PreciousMetalRate {
  fxName: string;    // "Altın", "Gümüş", "Platin", "Paladyum"
  fxCode: string;    // "ALT (gr)", "GMS (gr)", "PLT (gr)", "PLD (gr)"
  fxId: number;      // 24, 26, 27, ...
  buyRate: number;   // TL/gram (bankanın satış fiyatı = bizim alış)
  sellRate: number;  // TL/gram (bankanın alış fiyatı = bizim satış)
  isSpreadApplied: string;
}

export interface PreciousMetalRatesResponse {
  value: {
    rateList: PreciousMetalRate[];
  };
  results: any[];
  errors: any[];
  success: boolean;
}

export interface FxRate {
  name: string;
  fxCode: string;
  fxId: number;
  buyRate: number;
  sellRate: number;
  parityBuyRate: number;
  paritySellRate: number;
}

export interface FxRatesResponse {
  value: FxRate[];
  results: any[];
  success: boolean;
}

export interface PreciousMetalBuyRequest {
  AccountSuffixFrom: number;
  AccountSuffixTo: number;
  CorporateWebUserName: string;
  BuyRate: number;
  ExchangeAmount: number;
}

export interface PreciousMetalBuyResponse {
  value: {
    fromFec: string;
    toFec: string;
    transactionAmount: number;
    currencyAmount: number;
    fxRate: number;
  };
  executionReferenceId: string;
  results: any[];
  errors: any[];
  success: boolean;
}

// ============================================
// KuveytTürk FX Codes → Auxite Metal Symbols
// ============================================

export const KT_TO_AUXITE_MAP: Record<string, string> = {
  'ALT (gr)': 'AUXG',   // Altın → Gold
  'GMS (gr)': 'AUXS',   // Gümüş → Silver
  'PLT (gr)': 'AUXPT',  // Platin → Platinum
  'PLD (gr)': 'AUXPD',  // Paladyum → Palladium
};

export const AUXITE_TO_KT_MAP: Record<string, string> = {
  'AUXG': 'ALT (gr)',
  'AUXS': 'GMS (gr)',
  'AUXPT': 'PLT (gr)',
  'AUXPD': 'PLD (gr)',
};

// ============================================
// CONFIG
// ============================================

const CONFIG = {
  clientId: process.env.KUVEYTTURK_CLIENT_ID || '',
  clientSecret: process.env.KUVEYTTURK_CLIENT_SECRET || '',
  baseUrl: process.env.KUVEYTTURK_BASE_URL || 'https://prep-gateway.kuveytturk.com.tr',
  tokenUrl: process.env.KUVEYTTURK_TOKEN_URL || 'https://prep-identity.kuveytturk.com.tr/connect/token',
  rsaKeyPath: process.env.KUVEYTTURK_RSA_PRIVATE_KEY_PATH || './keys/private.pem',
};

// ============================================
// TOKEN MANAGEMENT
// ============================================

let cachedToken: KuveytTurkToken | null = null;

/**
 * Get OAuth 2.0 access token using Client Credentials flow
 */
export async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken) {
    const elapsed = (Date.now() - cachedToken.obtained_at) / 1000;
    if (elapsed < cachedToken.expires_in - 60) {
      return cachedToken.access_token;
    }
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'public',
    client_id: CONFIG.clientId,
    client_secret: CONFIG.clientSecret,
  });

  const response = await fetch(CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ KuveytTürk token error:', response.status, errorText);
    throw new Error(`KuveytTürk token request failed: ${response.status}`);
  }

  const data = await response.json();

  cachedToken = {
    access_token: data.access_token,
    token_type: data.token_type || 'Bearer',
    expires_in: data.expires_in || 3600,
    obtained_at: Date.now(),
  };

  console.log('✅ KuveytTürk token obtained, expires in', data.expires_in, 'seconds');
  return cachedToken.access_token;
}

// ============================================
// RSA-SHA256 SIGNATURE
// ============================================

let privateKey: string | null = null;

function getPrivateKey(): string {
  if (privateKey) return privateKey;

  try {
    const keyPath = path.resolve(CONFIG.rsaKeyPath);
    privateKey = fs.readFileSync(keyPath, 'utf-8');
    return privateKey;
  } catch (error) {
    console.error('❌ RSA private key not found at:', CONFIG.rsaKeyPath);
    throw new Error('RSA private key not found. Generate with: openssl genrsa -out keys/private.pem 2048');
  }
}

/**
 * Create RSA-SHA256 signature for API requests
 * For GET: sign(accessToken + queryString)
 * For POST: sign(accessToken + requestBody)
 */
function createSignature(accessToken: string, payload: string): string {
  const key = getPrivateKey();
  const dataToSign = accessToken + payload;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(dataToSign);
  sign.end();

  return sign.sign(key, 'base64');
}

// ============================================
// API REQUEST HELPER
// ============================================

interface ApiRequestOptions {
  method: 'GET' | 'POST';
  path: string;
  body?: any;
  queryString?: string;
}

async function kuveytTurkRequest<T>(options: ApiRequestOptions): Promise<T> {
  const accessToken = await getAccessToken();

  // Create signature
  let signaturePayload = '';
  if (options.method === 'POST' && options.body) {
    signaturePayload = JSON.stringify(options.body);
  } else if (options.method === 'GET' && options.queryString) {
    signaturePayload = options.queryString;
  }

  const signature = createSignature(accessToken, signaturePayload);

  const url = `${CONFIG.baseUrl}${options.path}${options.queryString ? '?' + options.queryString : ''}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Signature': signature,
    'Content-Type': 'application/json',
  };

  const fetchOptions: RequestInit = {
    method: options.method,
    headers,
    cache: 'no-store',
  };

  if (options.method === 'POST' && options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ KuveytTürk API error [${options.path}]:`, response.status, errorText);
    throw new Error(`KuveytTürk API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// ============================================
// PRECIOUS METAL RATES
// ============================================

let cachedRates: { data: PreciousMetalRate[]; timestamp: number } | null = null;
const RATES_CACHE_DURATION = 15000; // 15 seconds

/**
 * Fetch precious metal rates from KuveytTürk
 * Returns rates in TL/gram with buy and sell prices
 */
export async function getPreciousMetalRates(): Promise<PreciousMetalRate[]> {
  // Cache check
  if (cachedRates && Date.now() - cachedRates.timestamp < RATES_CACHE_DURATION) {
    return cachedRates.data;
  }

  try {
    const response = await kuveytTurkRequest<PreciousMetalRatesResponse>({
      method: 'GET',
      path: '/v1/preciousmetal/rates',
    });

    if (response.success && response.value?.rateList) {
      cachedRates = {
        data: response.value.rateList,
        timestamp: Date.now(),
      };

      console.log('✅ KuveytTürk precious metal rates fetched:',
        response.value.rateList.map(r => `${r.fxCode}: ${r.buyRate}/${r.sellRate} TL`).join(', ')
      );

      return response.value.rateList;
    }

    throw new Error('Invalid response from KuveytTürk rates API');
  } catch (error) {
    console.error('❌ KuveytTürk rates fetch error:', error);

    // Return cached data if available
    if (cachedRates) {
      console.warn('⚠️ Using stale KuveytTürk rates cache');
      return cachedRates.data;
    }

    throw error;
  }
}

/**
 * Get rates mapped to Auxite metal symbols
 * Returns: { AUXG: { buyRate, sellRate, ... }, AUXS: { ... }, ... }
 */
export async function getAuxiteMetalRates(): Promise<Record<string, PreciousMetalRate>> {
  const rates = await getPreciousMetalRates();
  const mapped: Record<string, PreciousMetalRate> = {};

  for (const rate of rates) {
    const auxiteSymbol = KT_TO_AUXITE_MAP[rate.fxCode];
    if (auxiteSymbol) {
      mapped[auxiteSymbol] = rate;
    }
  }

  return mapped;
}

// ============================================
// FX CURRENCY RATES (USD/TL etc.)
// ============================================

let cachedFxRates: { data: FxRate[]; timestamp: number } | null = null;
const FX_CACHE_DURATION = 30000; // 30 seconds

/**
 * Fetch FX currency rates (USD/TL, EUR/TL etc.)
 */
export async function getFxRates(): Promise<FxRate[]> {
  if (cachedFxRates && Date.now() - cachedFxRates.timestamp < FX_CACHE_DURATION) {
    return cachedFxRates.data;
  }

  try {
    const response = await kuveytTurkRequest<any>({
      method: 'GET',
      path: '/v2/fx/rates',
    });

    // Handle different response structures
    let rateList: FxRate[] = [];

    if (response.success && response.value) {
      if (Array.isArray(response.value)) {
        rateList = response.value;
      } else if (response.value.rateList && Array.isArray(response.value.rateList)) {
        rateList = response.value.rateList;
      } else if (typeof response.value === 'object') {
        // Try to extract from nested structure
        const vals = Object.values(response.value);
        if (vals.length > 0 && Array.isArray(vals[0])) {
          rateList = vals[0] as FxRate[];
        }
      }
    }

    if (rateList.length > 0) {
      cachedFxRates = {
        data: rateList,
        timestamp: Date.now(),
      };
      console.log('✅ KuveytTürk FX rates fetched:', rateList.length, 'currencies');
      return rateList;
    }

    console.warn('⚠️ FX rates response structure unexpected:', JSON.stringify(response).slice(0, 200));
    throw new Error('Invalid FX rates response');
  } catch (error) {
    console.error('❌ KuveytTürk FX rates error:', error);
    if (cachedFxRates) return cachedFxRates.data;
    throw error;
  }
}

// Fallback USD/TL rate (updated periodically - March 2026)
const FALLBACK_USD_TL = { buy: 44.05, sell: 43.76 };

/**
 * Get USD/TL rate
 */
export async function getUsdTlRate(): Promise<{ buy: number; sell: number }> {
  try {
    const rates = await getFxRates();
    const usd = rates.find(r => r.fxCode === 'USD');

    if (usd) {
      return {
        buy: usd.buyRate,
        sell: usd.sellRate,
      };
    }
  } catch (error) {
    console.warn('⚠️ FX rates failed, using fallback USD/TL rate');
  }

  // Fallback: return estimated USD/TL rate
  console.warn('⚠️ Using fallback USD/TL rate:', FALLBACK_USD_TL);
  return FALLBACK_USD_TL;
}

// ============================================
// PRECIOUS METAL BUY
// ============================================

/**
 * Buy precious metal via KuveytTürk
 */
export async function buyPreciousMetal(params: PreciousMetalBuyRequest): Promise<PreciousMetalBuyResponse> {
  return kuveytTurkRequest<PreciousMetalBuyResponse>({
    method: 'POST',
    path: '/v1/preciousmetal/buy',
    body: params,
  });
}

// ============================================
// PRECIOUS METAL SELL
// ============================================

/**
 * Sell precious metal via KuveytTürk
 */
export async function sellPreciousMetal(params: {
  AccountSuffixFrom: number;
  AccountSuffixTo: number;
  CorporateWebUserName: string;
  SellRate: number;
  ExchangeAmount: number;
}): Promise<any> {
  return kuveytTurkRequest({
    method: 'POST',
    path: '/v1/preciousmetal/sell',
    body: params,
  });
}

// ============================================
// UTILITY: Convert TL prices to USD
// ============================================

/**
 * Convert KuveytTürk TL/gram prices to USD/gram and USD/oz
 * Uses live USD/TL rate from KuveytTürk FX API
 */
export async function getMetalPricesInUsd(): Promise<Record<string, {
  buyRateTL: number;
  sellRateTL: number;
  buyRateUSD: number;
  sellRateUSD: number;
  buyRateUSDOz: number;
  sellRateUSDOz: number;
  fxCode: string;
  fxName: string;
}>> {
  const TROY_OZ_TO_GRAM = 31.1035;

  const [metalRates, usdRate] = await Promise.all([
    getAuxiteMetalRates(),
    getUsdTlRate(),
  ]);

  const result: Record<string, any> = {};

  for (const [symbol, rate] of Object.entries(metalRates)) {
    const buyUsdGram = rate.buyRate / usdRate.sell;  // TL→USD: divide by USD sell rate
    const sellUsdGram = rate.sellRate / usdRate.buy;  // TL→USD: divide by USD buy rate

    result[symbol] = {
      buyRateTL: rate.buyRate,
      sellRateTL: rate.sellRate,
      buyRateUSD: Math.round(buyUsdGram * 100) / 100,
      sellRateUSD: Math.round(sellUsdGram * 100) / 100,
      buyRateUSDOz: Math.round(buyUsdGram * TROY_OZ_TO_GRAM * 100) / 100,
      sellRateUSDOz: Math.round(sellUsdGram * TROY_OZ_TO_GRAM * 100) / 100,
      fxCode: rate.fxCode,
      fxName: rate.fxName,
    };
  }

  return result;
}
