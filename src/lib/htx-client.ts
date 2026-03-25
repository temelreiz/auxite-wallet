// src/lib/htx-client.ts
// HTX (formerly Huobi) API Client
// Raw HTTP calls with HMAC-SHA256 signature authentication

import * as crypto from "crypto";

const HTX_BASE_URL = "https://api.huobi.pro";
const SIGNATURE_METHOD = "HmacSHA256";
const SIGNATURE_VERSION = "2";

// ============================================
// TYPES
// ============================================

export interface HTXBalance {
  currency: string;
  type: "trade" | "frozen" | "loan" | "interest";
  balance: string;
}

export interface HTXAccountBalance {
  id: number;
  type: string;
  state: string;
  list: HTXBalance[];
}

export interface HTXTicker {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  amount: number;
  vol: number;
  count: number;
  bid: number;
  bidSize: number;
  ask: number;
  askSize: number;
}

export interface HTXOrder {
  id: number;
  symbol: string;
  type: string;
  amount: string;
  price: string;
  state: string;
  "created-at": number;
  "finished-at"?: number;
  "field-amount": string;
  "field-cash-amount": string;
  "field-fees": string;
}

export interface HTXDepositAddress {
  currency: string;
  address: string;
  addressTag: string;
  chain: string;
}

export interface HTXWithdrawResult {
  id: number;
  status: string;
}

interface HTXResponse<T> {
  status: string;
  data: T;
  "err-code"?: string;
  "err-msg"?: string;
}

// ============================================
// SIGNATURE GENERATION
// ============================================

function getAccessKey(): string {
  const key = process.env.HTX_ACCESS_KEY;
  if (!key) throw new Error("HTX_ACCESS_KEY not configured");
  return key;
}

function getSecretKey(): string {
  const key = process.env.HTX_SECRET_KEY;
  if (!key) throw new Error("HTX_SECRET_KEY not configured");
  return key;
}

function getUTCTimestamp(): string {
  return new Date().toISOString().slice(0, 19);
}

/**
 * Build the signature base string per HTX docs:
 * {METHOD}\n{HOST}\n{PATH}\n{SORTED_QUERY_PARAMS}
 */
function buildSignaturePayload(
  method: "GET" | "POST",
  path: string,
  params: Record<string, string>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join("&");

  return `${method}\napi.huobi.pro\n${path}\n${sortedParams}`;
}

/**
 * Generate HMAC-SHA256 signature
 */
function signPayload(payload: string): string {
  const secretKey = getSecretKey();
  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(payload);
  return hmac.digest("base64");
}

/**
 * Build authenticated query params with signature
 */
function buildAuthParams(
  method: "GET" | "POST",
  path: string,
  extraParams: Record<string, string> = {}
): Record<string, string> {
  const params: Record<string, string> = {
    AccessKeyId: getAccessKey(),
    SignatureMethod: SIGNATURE_METHOD,
    SignatureVersion: SIGNATURE_VERSION,
    Timestamp: getUTCTimestamp(),
    ...extraParams,
  };

  const payload = buildSignaturePayload(method, path, params);
  const signature = signPayload(payload);
  params.Signature = signature;

  return params;
}

/**
 * Build full URL with query params
 */
function buildUrl(path: string, params: Record<string, string>): string {
  const queryString = Object.keys(params)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join("&");
  return `${HTX_BASE_URL}${path}?${queryString}`;
}

// ============================================
// HTTP HELPERS
// ============================================

async function htxGet<T>(path: string, extraParams: Record<string, string> = {}): Promise<T> {
  const params = buildAuthParams("GET", path, extraParams);
  const url = buildUrl(path, params);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Auxite-Wallet/1.0",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTX API GET ${path} failed (${response.status}): ${text}`);
  }

  const json: HTXResponse<T> = await response.json();

  if (json.status !== "ok") {
    throw new Error(`HTX API error: ${json["err-code"]} - ${json["err-msg"]}`);
  }

  return json.data;
}

async function htxPost<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const params = buildAuthParams("POST", path);
  const url = buildUrl(path, params);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Auxite-Wallet/1.0",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTX API POST ${path} failed (${response.status}): ${text}`);
  }

  const json: HTXResponse<T> = await response.json();

  if (json.status !== "ok") {
    throw new Error(`HTX API error: ${json["err-code"]} - ${json["err-msg"]}`);
  }

  return json.data;
}

/**
 * Public GET (no authentication needed for market data)
 */
async function htxPublicGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const queryString = Object.keys(params)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join("&");
  const url = queryString
    ? `${HTX_BASE_URL}${path}?${queryString}`
    : `${HTX_BASE_URL}${path}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Auxite-Wallet/1.0",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTX Public API GET ${path} failed (${response.status}): ${text}`);
  }

  const json = await response.json();

  // Market ticker endpoint returns { status, tick } instead of { status, data }
  if (json.status !== "ok") {
    throw new Error(`HTX Public API error: ${json["err-code"]} - ${json["err-msg"]}`);
  }

  return json.data ?? json.tick;
}

// ============================================
// ACCOUNT ID CACHE
// ============================================

let cachedAccountId: number | null = null;

async function getSpotAccountId(): Promise<number> {
  if (cachedAccountId !== null) return cachedAccountId;

  const accounts = await htxGet<Array<{ id: number; type: string; state: string }>>(
    "/v1/account/accounts"
  );

  const spotAccount = accounts.find((a) => a.type === "spot" && a.state === "working");
  if (!spotAccount) {
    throw new Error("No active HTX spot account found");
  }

  cachedAccountId = spotAccount.id;
  return cachedAccountId;
}

// ============================================
// PUBLIC API METHODS
// ============================================

/**
 * Get all balances on HTX spot account
 */
export async function getAccountBalance(): Promise<HTXAccountBalance> {
  const accountId = await getSpotAccountId();
  return htxGet<HTXAccountBalance>(`/v1/account/accounts/${accountId}/balance`);
}

/**
 * Get current market ticker for a symbol (e.g. "btcusdt", "ethusdt")
 */
export async function getMarketTicker(symbol: string): Promise<HTXTicker> {
  return htxPublicGet<HTXTicker>("/market/detail/merged", {
    symbol: symbol.toLowerCase(),
  });
}

/**
 * Place an order on HTX
 * @param symbol - Trading pair (e.g. "btcusdt")
 * @param type - Order type: "buy-market", "sell-market", "buy-limit", "sell-limit"
 * @param amount - Quantity to buy/sell
 * @param price - Price for limit orders (optional for market orders)
 */
export async function createOrder(
  symbol: string,
  type: "buy-market" | "sell-market" | "buy-limit" | "sell-limit",
  amount: number,
  price?: number
): Promise<string> {
  const accountId = await getSpotAccountId();

  const body: Record<string, unknown> = {
    "account-id": accountId,
    symbol: symbol.toLowerCase(),
    type,
    amount: amount.toString(),
    source: "spot-api",
  };

  if (price !== undefined && (type === "buy-limit" || type === "sell-limit")) {
    body.price = price.toString();
  }

  // Returns the order ID as a string
  const orderId = await htxPost<string>("/v1/order/orders/place", body);
  return orderId;
}

/**
 * Get HTX deposit address for a currency
 * @param currency - Currency code (e.g. "btc", "eth", "usdt")
 */
export async function getDepositAddress(
  currency: string
): Promise<HTXDepositAddress[]> {
  return htxGet<HTXDepositAddress[]>("/v2/account/deposit/address", {
    currency: currency.toLowerCase(),
  });
}

/**
 * Withdraw from HTX to an external address
 * @param currency - Currency code (e.g. "btc", "eth", "usdt")
 * @param address - Destination wallet address
 * @param amount - Amount to withdraw
 * @param chain - Optional chain (e.g. "erc20", "trc20" for USDT)
 */
export async function withdraw(
  currency: string,
  address: string,
  amount: number,
  chain?: string
): Promise<number> {
  const body: Record<string, unknown> = {
    address,
    amount: amount.toString(),
    currency: currency.toLowerCase(),
  };

  if (chain) {
    body.chain = chain.toLowerCase();
  }

  // Returns the withdraw ID
  const withdrawId = await htxPost<number>("/v1/dw/withdraw/api/create", body);
  return withdrawId;
}

/**
 * Get order status by order ID
 */
export async function getOrderStatus(orderId: string): Promise<HTXOrder> {
  return htxGet<HTXOrder>(`/v1/order/orders/${orderId}`);
}

/**
 * Get multiple market tickers at once (public, no auth)
 */
export async function getMarketTickers(): Promise<
  Array<{ symbol: string; close: number; open: number; high: number; low: number; vol: number }>
> {
  return htxPublicGet<
    Array<{ symbol: string; close: number; open: number; high: number; low: number; vol: number }>
  >("/market/tickers");
}

/**
 * Get open orders for a symbol
 */
export async function getOpenOrders(
  symbol: string
): Promise<HTXOrder[]> {
  const accountId = await getSpotAccountId();
  return htxGet<HTXOrder[]>("/v1/order/openOrders", {
    "account-id": accountId.toString(),
    symbol: symbol.toLowerCase(),
    size: "100",
  });
}

/**
 * Cancel an order
 */
export async function cancelOrder(orderId: string): Promise<string> {
  return htxPost<string>(`/v1/order/orders/${orderId}/submitcancel`);
}
