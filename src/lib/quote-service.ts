// Quote Service - Lock prices for trades with dynamic spread
import { Redis } from '@upstash/redis';
import { getMetalPrices } from './price-cache';
import { getMetalSpread, applySpread } from './spread-config';
import crypto from 'crypto';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const QUOTE_TTL = 30; // 30 saniye geçerli

export interface Quote {
  id: string;
  type: 'buy' | 'sell';
  metal: string;
  grams: number;
  basePrice: number;      // Ham fiyat (spread'siz)
  pricePerGram: number;   // Spread uygulanmış fiyat
  spreadPercent: number;  // Uygulanan spread %
  totalUSD: number;
  totalAUXM: number;
  expiresAt: number;
  createdAt: number;
}

/**
 * Create a price quote - locks the price for 15 seconds
 */
export async function createQuote(
  type: 'buy' | 'sell',
  metal: string,
  grams: number,
  userAddress: string
): Promise<Quote> {
  // Fetch live price
  const prices = await getMetalPrices();
  
  let basePrice: number;
  switch (metal.toUpperCase()) {
    case 'AUXG': basePrice = prices.gold; break;
    case 'AUXS': basePrice = prices.silver; break;
    case 'AUXPT': basePrice = prices.platinum; break;
    case 'AUXPD': basePrice = prices.palladium; break;
    default: throw new Error('Invalid metal');
  }

  // Get admin-configured spread
  const spread = await getMetalSpread(metal);
  const spreadPercent = type === 'buy' ? spread.buy : spread.sell;
  
  // Apply spread
  const pricePerGram = applySpread(basePrice, type, spreadPercent);
  const totalUSD = pricePerGram * grams;
  
  const quote: Quote = {
    id: crypto.randomBytes(16).toString('hex'),
    type,
    metal: metal.toUpperCase(),
    grams,
    basePrice,
    pricePerGram,
    spreadPercent,
    totalUSD,
    totalAUXM: totalUSD, // 1 AUXM = 1 USD
    expiresAt: Date.now() + (QUOTE_TTL * 1000),
    createdAt: Date.now(),
  };

  // Store in Redis
  await redis.setex(
    `quote:${quote.id}`,
    QUOTE_TTL,
    JSON.stringify(quote)
  );

  // Link to user
  await redis.setex(
    `quote:user:${userAddress}`,
    QUOTE_TTL,
    quote.id
  );

  return quote;
}

/**
 * Get and validate a quote
 */
export async function getQuote(quoteId: string): Promise<Quote | null> {
  const data = await redis.get(`quote:${quoteId}`);
  if (!data) return null;

  const quote: Quote = typeof data === 'string' ? JSON.parse(data) : data;
  
  if (Date.now() > quote.expiresAt) {
    await redis.del(`quote:${quoteId}`);
    return null;
  }

  return quote;
}

/**
 * Execute a quote - marks it as used
 */
export async function executeQuote(quoteId: string): Promise<Quote | null> {
  const quote = await getQuote(quoteId);
  if (!quote) return null;

  await redis.del(`quote:${quoteId}`);
  return quote;
}

export function getQuoteTimeRemaining(quote: Quote): number {
  return Math.max(0, Math.floor((quote.expiresAt - Date.now()) / 1000));
}
