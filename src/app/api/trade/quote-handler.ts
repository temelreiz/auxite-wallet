// Quote-based trade handler
import { executeQuote, Quote } from '@/lib/quote-service';
import { updateOraclePrices } from '@/lib/oracle-updater';

export async function handleQuoteTrade(
  quoteId: string,
  userAddress: string
): Promise<{ success: boolean; quote?: Quote; error?: string }> {
  
  // 1. Get and validate quote
  const quote = await executeQuote(quoteId);
  
  if (!quote) {
    return { success: false, error: 'Quote expired veya bulunamadı' };
  }

  // 2. Update oracle with fresh price (background, don't wait)
  updateOraclePrices().catch(err => 
    console.error('Oracle update failed:', err)
  );

  // 3. Return quote for trade execution
  return { success: true, quote };
}
