// NOWPayments Payout API Service
// Docs: https://documenter.getpostman.com/view/7907941/2s93JusNJt

const NOWPAYMENTS_API = 'https://api.nowpayments.io/v1';

interface PayoutResult {
  success: boolean;
  payoutId?: string;
  txHash?: string;
  error?: string;
}

interface PayoutStatusResult {
  status: string;
  hash?: string;
  error?: string;
}

/**
 * BTC Payout via NOWPayments
 */
export async function createBTCPayout(
  toAddress: string,
  amount: number // in BTC
): Promise<PayoutResult> {
  try {
    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    
    if (!apiKey) {
      return { success: false, error: 'NOWPayments API key not configured' };
    }

    // 1. Önce auth token al
    const authRes = await fetch(`${NOWPAYMENTS_API}/auth`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: process.env.NOWPAYMENTS_EMAIL,
        password: process.env.NOWPAYMENTS_PASSWORD,
      }),
    });

    if (!authRes.ok) {
      // Auth olmadan payout deneyelim (bazı planlarda direk çalışır)
      console.log('Auth failed, trying direct payout...');
    }

    // 2. Payout oluştur
    const payoutRes = await fetch(`${NOWPAYMENTS_API}/payout`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        withdrawals: [
          {
            address: toAddress,
            currency: 'btc',
            amount: amount,
          },
        ],
        ipn_callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/nowpayments`,
      }),
    });

    const payoutData = await payoutRes.json();
    console.log('NOWPayments Payout Response:', payoutData);

    if (!payoutRes.ok) {
      return { 
        success: false, 
        error: payoutData.message || payoutData.error || 'Payout failed' 
      };
    }

    // Payout ID'yi al
    const payoutId = payoutData.id || payoutData.withdrawals?.[0]?.id;

    return {
      success: true,
      payoutId: String(payoutId),
    };

  } catch (error: any) {
    console.error('NOWPayments payout error:', error);
    return { success: false, error: error.message || 'BTC payout failed' };
  }
}

/**
 * Payout durumunu kontrol et
 */
export async function getPayoutStatus(payoutId: string): Promise<PayoutStatusResult> {
  try {
    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    
    const res = await fetch(`${NOWPAYMENTS_API}/payout/${payoutId}`, {
      headers: {
        'x-api-key': apiKey!,
      },
    });

    const data = await res.json();

    return {
      status: data.status || 'unknown',
      hash: data.hash || data.batch_withdrawal_id,
    };
  } catch (error: any) {
    return { status: 'error', error: error.message };
  }
}

/**
 * XRP Payout via NOWPayments
 */
export async function createXRPPayout(
  toAddress: string,
  amount: number, // in XRP
  destinationTag?: number
): Promise<PayoutResult> {
  try {
    const apiKey = process.env.NOWPAYMENTS_API_KEY;

    if (!apiKey) {
      return { success: false, error: 'NOWPayments API key not configured' };
    }

    const withdrawal: any = {
      address: toAddress,
      currency: 'xrp',
      amount: amount,
    };

    // XRP destination tag (memo) if provided
    if (destinationTag) {
      withdrawal.extra_id = String(destinationTag);
    }

    const payoutRes = await fetch(`${NOWPAYMENTS_API}/payout`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        withdrawals: [withdrawal],
        ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/nowpayments/ipn`,
      }),
    });

    const payoutData = await payoutRes.json();
    console.log('NOWPayments XRP Payout Response:', payoutData);

    if (!payoutRes.ok) {
      return {
        success: false,
        error: payoutData.message || payoutData.error || 'XRP Payout failed'
      };
    }

    const payoutId = payoutData.id || payoutData.withdrawals?.[0]?.id;

    return {
      success: true,
      payoutId: String(payoutId),
    };

  } catch (error: any) {
    console.error('NOWPayments XRP payout error:', error);
    return { success: false, error: error.message || 'XRP payout failed' };
  }
}

/**
 * SOL Payout via NOWPayments
 */
export async function createSOLPayout(
  toAddress: string,
  amount: number // in SOL
): Promise<PayoutResult> {
  try {
    const apiKey = process.env.NOWPAYMENTS_API_KEY;

    if (!apiKey) {
      return { success: false, error: 'NOWPayments API key not configured' };
    }

    const payoutRes = await fetch(`${NOWPAYMENTS_API}/payout`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        withdrawals: [
          {
            address: toAddress,
            currency: 'sol',
            amount: amount,
          },
        ],
        ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/nowpayments/ipn`,
      }),
    });

    const payoutData = await payoutRes.json();
    console.log('NOWPayments SOL Payout Response:', payoutData);

    if (!payoutRes.ok) {
      return {
        success: false,
        error: payoutData.message || payoutData.error || 'SOL Payout failed'
      };
    }

    const payoutId = payoutData.id || payoutData.withdrawals?.[0]?.id;

    return {
      success: true,
      payoutId: String(payoutId),
    };

  } catch (error: any) {
    console.error('NOWPayments SOL payout error:', error);
    return { success: false, error: error.message || 'SOL payout failed' };
  }
}

/**
 * Generic Crypto Payout via NOWPayments
 * Supports: BTC, XRP, SOL, and other currencies
 */
export async function createCryptoPayout(
  currency: 'btc' | 'xrp' | 'sol',
  toAddress: string,
  amount: number,
  extraId?: string // For XRP destination tag, etc.
): Promise<PayoutResult> {
  try {
    const apiKey = process.env.NOWPAYMENTS_API_KEY;

    if (!apiKey) {
      return { success: false, error: 'NOWPayments API key not configured' };
    }

    const withdrawal: any = {
      address: toAddress,
      currency: currency.toLowerCase(),
      amount: amount,
    };

    if (extraId) {
      withdrawal.extra_id = extraId;
    }

    console.log(`📤 NOWPayments ${currency.toUpperCase()} Payout Request:`, {
      address: toAddress,
      amount: amount,
      currency: currency,
    });

    const payoutRes = await fetch(`${NOWPAYMENTS_API}/payout`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        withdrawals: [withdrawal],
        ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/nowpayments/ipn`,
      }),
    });

    const payoutData = await payoutRes.json();
    console.log(`NOWPayments ${currency.toUpperCase()} Payout Response:`, payoutData);

    if (!payoutRes.ok) {
      return {
        success: false,
        error: payoutData.message || payoutData.error || `${currency.toUpperCase()} Payout failed`
      };
    }

    const payoutId = payoutData.id || payoutData.withdrawals?.[0]?.id;

    return {
      success: true,
      payoutId: String(payoutId),
    };

  } catch (error: any) {
    console.error(`NOWPayments ${currency} payout error:`, error);
    return { success: false, error: error.message || `${currency.toUpperCase()} payout failed` };
  }
}

/**
 * NOWPayments bakiyesini kontrol et
 */
export async function getNOWPaymentsBalance(): Promise<Record<string, number>> {
  try {
    const apiKey = process.env.NOWPAYMENTS_API_KEY;

    if (!apiKey) {
      console.error('NOWPayments API key not configured');
      return {};
    }

    const res = await fetch(`${NOWPAYMENTS_API}/balance`, {
      headers: {
        'x-api-key': apiKey,
      },
    });

    const data = await res.json();
    console.log('NOWPayments Balance Response:', data);

    // Bakiyeleri parse et
    const balances: Record<string, number> = {};
    if (data.result) {
      data.result.forEach((item: any) => {
        balances[item.currency?.toUpperCase()] = parseFloat(item.amount) || 0;
      });
    }

    return balances;
  } catch (error) {
    console.error('NOWPayments balance error:', error);
    return {};
  }
}

/**
 * Check if NOWPayments has sufficient balance for payout
 */
export async function checkPayoutBalance(
  currency: 'btc' | 'xrp' | 'sol',
  requiredAmount: number
): Promise<{ sufficient: boolean; available: number }> {
  const balances = await getNOWPaymentsBalance();
  const available = balances[currency.toUpperCase()] || 0;

  return {
    sufficient: available >= requiredAmount,
    available,
  };
}
