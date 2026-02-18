// lib/statement-email.ts
// Monthly Custody Statement Email — Swiss Private Bank Style
// Sends portfolio summary + transaction history for the previous month

import { Resend } from 'resend';
import { getRedis } from './redis';
import { getUserBalance, getTransactions, type UserBalance, type Transaction } from './redis';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@auxite.io';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface StatementUser {
  address: string;
  email: string;
  name: string;
  language: string;
}

interface MetalPrices {
  auxg: number;
  auxs: number;
  auxpt: number;
  auxpd: number;
  eth: number;
  btc: number;
}

// ═══════════════════════════════════════════════════════════════
// METAL / ASSET LABELS
// ═══════════════════════════════════════════════════════════════

const METAL_LABELS: Record<string, { en: string; tr: string; symbol: string; unit: string }> = {
  auxg:  { en: 'Gold (AUXG)', tr: 'Altın (AUXG)', symbol: 'AUXG', unit: 'g' },
  auxs:  { en: 'Silver (AUXS)', tr: 'Gümüş (AUXS)', symbol: 'AUXS', unit: 'g' },
  auxpt: { en: 'Platinum (AUXPT)', tr: 'Platin (AUXPT)', symbol: 'AUXPT', unit: 'g' },
  auxpd: { en: 'Palladium (AUXPD)', tr: 'Paladyum (AUXPD)', symbol: 'AUXPD', unit: 'g' },
  auxm:  { en: 'AUXM Token', tr: 'AUXM Token', symbol: 'AUXM', unit: '' },
  eth:   { en: 'Ethereum (ETH)', tr: 'Ethereum (ETH)', symbol: 'ETH', unit: '' },
  btc:   { en: 'Bitcoin (BTC)', tr: 'Bitcoin (BTC)', symbol: 'BTC', unit: '' },
  xrp:   { en: 'Ripple (XRP)', tr: 'Ripple (XRP)', symbol: 'XRP', unit: '' },
  sol:   { en: 'Solana (SOL)', tr: 'Solana (SOL)', symbol: 'SOL', unit: '' },
  usdt:  { en: 'Tether (USDT)', tr: 'Tether (USDT)', symbol: 'USDT', unit: '' },
  usd:   { en: 'USD Balance', tr: 'USD Bakiye', symbol: 'USD', unit: '' },
};

// ═══════════════════════════════════════════════════════════════
// I18N
// ═══════════════════════════════════════════════════════════════

const i18n: Record<string, Record<string, string>> = {
  en: {
    subject: 'Monthly Custody Statement',
    greeting: 'Dear',
    intro: 'Please find below your monthly custody statement for the period ending',
    portfolioTitle: 'Portfolio Summary',
    metalHoldings: 'Precious Metal Holdings',
    cryptoHoldings: 'Digital Asset Holdings',
    asset: 'Asset',
    balance: 'Balance',
    transactionsTitle: 'Transaction Activity',
    date: 'Date',
    type: 'Type',
    amount: 'Amount',
    status: 'Status',
    noTransactions: 'No transactions recorded during this period.',
    totalAssets: 'Total Assets Under Custody',
    disclaimer: 'This statement is provided for informational purposes only and reflects holdings as of the statement date. Prices are indicative and may differ from market values at the time of viewing. This document does not constitute investment advice.',
    deskSign: 'Custody & Settlement Desk',
    retainNotice: 'This message serves as an operational confirmation and should be retained for your financial records.',
  },
  tr: {
    subject: 'Aylık Saklama Ekstresi',
    greeting: 'Sayın',
    intro: 'Aşağıda, dönem sonu itibarıyla aylık saklama ekstrenizi bulabilirsiniz',
    portfolioTitle: 'Portföy Özeti',
    metalHoldings: 'Kıymetli Metal Varlıkları',
    cryptoHoldings: 'Dijital Varlıklar',
    asset: 'Varlık',
    balance: 'Bakiye',
    transactionsTitle: 'İşlem Aktivitesi',
    date: 'Tarih',
    type: 'Tür',
    amount: 'Miktar',
    status: 'Durum',
    noTransactions: 'Bu dönemde işlem kaydedilmedi.',
    totalAssets: 'Saklamadaki Toplam Varlık',
    disclaimer: 'Bu ekstre yalnızca bilgilendirme amaçlıdır ve ekstre tarihi itibarıyla varlıkları yansıtmaktadır. Fiyatlar gösterge niteliğindedir. Bu belge yatırım tavsiyesi niteliği taşımaz.',
    deskSign: 'Saklama ve Takas Masası',
    retainNotice: 'Bu mesaj operasyonel bir onay niteliğindedir ve mali kayıtlarınız için saklanmalıdır.',
  },
};

// ═══════════════════════════════════════════════════════════════
// DATE HELPERS
// ═══════════════════════════════════════════════════════════════

function getMonthLabel(year: number, month: number, lang: string): string {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { year: 'numeric', month: 'long' });
}

function formatDate(ts: number, lang: string): string {
  return new Date(ts).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

// ═══════════════════════════════════════════════════════════════
// HTML TEMPLATE
// ═══════════════════════════════════════════════════════════════

function buildStatementHtml(
  user: StatementUser,
  balance: UserBalance,
  transactions: Transaction[],
  periodLabel: string,
  periodEnding: string,
  lang: string,
): string {
  const t = i18n[lang] || i18n.en;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  // Metal holdings rows
  const metalKeys = ['auxg', 'auxs', 'auxpt', 'auxpd'] as const;
  const metalRows = metalKeys
    .filter(k => (balance[k] || 0) > 0)
    .map(k => {
      const label = METAL_LABELS[k]?.[lang as 'en' | 'tr'] || METAL_LABELS[k]?.en || k;
      const val = balance[k] || 0;
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px;color:#444;">${label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px;color:#1a1a1a;text-align:right;font-weight:600;">${val.toFixed(3)} g</td>
      </tr>`;
    }).join('');

  // Crypto/token holdings rows
  const cryptoKeys = ['auxm', 'eth', 'btc', 'xrp', 'sol', 'usdt', 'usd'] as const;
  const cryptoRows = cryptoKeys
    .filter(k => (balance[k] || 0) > 0)
    .map(k => {
      const label = METAL_LABELS[k]?.[lang as 'en' | 'tr'] || METAL_LABELS[k]?.en || k;
      const val = balance[k] || 0;
      const unit = METAL_LABELS[k]?.symbol || k.toUpperCase();
      const decimals = ['usd', 'usdt'].includes(k) ? 2 : ['btc'].includes(k) ? 8 : 4;
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px;color:#444;">${label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px;color:#1a1a1a;text-align:right;font-weight:600;">${val.toFixed(decimals)} ${unit}</td>
      </tr>`;
    }).join('');

  // Transaction rows (filter to the statement month)
  const txTypeLabels: Record<string, Record<string, string>> = {
    deposit:  { en: 'Deposit', tr: 'Yatırma' },
    withdraw: { en: 'Withdrawal', tr: 'Çekim' },
    swap:     { en: 'Swap', tr: 'Takas' },
    transfer: { en: 'Transfer', tr: 'Transfer' },
    bonus:    { en: 'Bonus', tr: 'Bonus' },
    buy:      { en: 'Buy', tr: 'Alış' },
    sell:     { en: 'Sell', tr: 'Satış' },
  };

  const txRows = transactions.length > 0
    ? transactions.slice(0, 50).map(tx => {
      const typeLabel = txTypeLabels[tx.type]?.[lang] || txTypeLabels[tx.type]?.en || tx.type;
      const token = tx.toToken || tx.token || tx.fromToken || '';
      const amount = tx.toAmount || tx.amount || tx.fromAmount || 0;
      return `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:11px;color:#666;">${formatDate(tx.timestamp, lang)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:11px;color:#444;">${typeLabel}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:11px;color:#1a1a1a;text-align:right;">${Number(amount).toFixed(4)} ${token.toUpperCase()}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:11px;color:#1a1a1a;text-align:right;">
          <span style="color:${tx.status === 'completed' ? '#16a34a' : tx.status === 'failed' ? '#dc2626' : '#d97706'};">${tx.status}</span>
        </td>
      </tr>`;
    }).join('')
    : `<tr><td colspan="4" style="padding:16px 12px;text-align:center;font-size:12px;color:#888;">${t.noTransactions}</td></tr>`;

  const statementRef = `STMT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${user.address.slice(2, 8).toUpperCase()}`;

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family:Georgia,'Times New Roman',serif;background:#f5f5f5;margin:0;padding:20px;color:#1a1a1a;">
  <div style="max-width:600px;margin:0 auto;background:#fff;">
    <div style="height:3px;background:#C5A55A;"></div>
    <div style="padding:24px 30px 16px;border-bottom:1px solid #e5e5e5;">
      <h1 style="font-size:13px;letter-spacing:5px;color:#1a1a1a;font-weight:700;text-transform:uppercase;margin:0 0 2px 0;">Auxite</h1>
      <p style="font-size:11px;color:#888;margin:0;">Custody &amp; Settlement Services</p>
    </div>

    <div style="padding:28px 30px;">
      <h2 style="font-size:16px;color:#1a1a1a;font-weight:400;margin:0 0 16px 0;">${t.subject} — ${periodLabel}</h2>
      <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 14px 0;">
        ${t.greeting} ${user.name},
      </p>
      <p style="font-size:13px;color:#444;line-height:1.7;margin:0 0 20px 0;">
        ${t.intro} <strong>${periodEnding}</strong>.
      </p>

      <!-- ═══ METAL HOLDINGS ═══ -->
      ${metalRows ? `
      <div style="background:#fafafa;border-left:3px solid #C5A55A;padding:16px 0;margin:18px 0;">
        <p style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;padding:0 12px;margin:0 0 8px 0;">${t.metalHoldings}</p>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="padding:6px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;border-bottom:1px solid #ddd;">${t.asset}</th>
              <th style="padding:6px 12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;border-bottom:1px solid #ddd;">${t.balance}</th>
            </tr>
          </thead>
          <tbody>
            ${metalRows}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- ═══ CRYPTO / TOKEN HOLDINGS ═══ -->
      ${cryptoRows ? `
      <div style="background:#fafafa;border-left:3px solid #C5A55A;padding:16px 0;margin:18px 0;">
        <p style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;padding:0 12px;margin:0 0 8px 0;">${t.cryptoHoldings}</p>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="padding:6px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;border-bottom:1px solid #ddd;">${t.asset}</th>
              <th style="padding:6px 12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;border-bottom:1px solid #ddd;">${t.balance}</th>
            </tr>
          </thead>
          <tbody>
            ${cryptoRows}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- ═══ TRANSACTIONS ═══ -->
      <div style="margin:24px 0;">
        <p style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 8px 0;">${t.transactionsTitle}</p>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#fafafa;">
              <th style="padding:6px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;border-bottom:1px solid #ddd;">${t.date}</th>
              <th style="padding:6px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;border-bottom:1px solid #ddd;">${t.type}</th>
              <th style="padding:6px 12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;border-bottom:1px solid #ddd;">${t.amount}</th>
              <th style="padding:6px 12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;border-bottom:1px solid #ddd;">${t.status}</th>
            </tr>
          </thead>
          <tbody>
            ${txRows}
          </tbody>
        </table>
      </div>

      <!-- ═══ REFERENCE ═══ -->
      <div style="background:#fafafa;border-left:3px solid #C5A55A;padding:12px 18px;margin:18px 0;">
        <table style="width:100%;">
          <tr>
            <td style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;">Statement Ref</td>
            <td style="font-size:12px;font-weight:600;color:#1a1a1a;text-align:right;">${statementRef}</td>
          </tr>
          <tr>
            <td style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;">Wallet</td>
            <td style="font-size:11px;font-family:monospace;color:#1a1a1a;text-align:right;">${user.address.slice(0, 6)}...${user.address.slice(-4)}</td>
          </tr>
        </table>
      </div>

      <p style="font-size:11px;color:#888;font-style:italic;margin-top:20px;padding-top:16px;border-top:1px solid #eee;">${t.disclaimer}</p>

      <p style="font-size:12px;color:#666;font-style:italic;margin-top:24px;padding-top:16px;border-top:1px solid #eee;">${t.deskSign}</p>
      <p style="font-size:10px;color:#999;margin-top:12px;font-style:italic;">${t.retainNotice}</p>
    </div>

    <div style="padding:16px 30px;border-top:1px solid #e5e5e5;text-align:center;">
      <p style="font-size:9px;color:#aaa;margin:4px 0;">Aurum Ledger Ltd &middot; Hong Kong</p>
      <p style="font-size:9px;color:#aaa;margin:4px 0;">This is an automated notification. Please do not reply.</p>
    </div>
    <div style="height:2px;background:#C5A55A;"></div>
  </div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
// SEND MONTHLY STATEMENT EMAIL
// ═══════════════════════════════════════════════════════════════

export async function sendMonthlyStatementEmail(
  user: StatementUser,
  balance: UserBalance,
  transactions: Transaction[],
  year: number,
  month: number, // 0-indexed (Jan=0)
): Promise<{ success: boolean; error?: string }> {
  const lang = user.language || 'en';
  const t = i18n[lang] || i18n.en;
  const periodLabel = getMonthLabel(year, month, lang);
  const lastDay = new Date(year, month + 1, 0);
  const periodEnding = lastDay.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const html = buildStatementHtml(user, balance, transactions, periodLabel, periodEnding, lang);
  const subject = `${t.subject} — ${periodLabel}`;

  try {
    if (!resend) {
      console.error('[statement-email] RESEND_API_KEY not configured');
      return { success: false, error: 'Email service not configured' };
    }

    const { data, error } = await resend.emails.send({
      from: `Auxite <${FROM_EMAIL}>`,
      to: user.email,
      subject,
      html,
    });

    if (error) {
      console.error(`[statement-email] Resend error for ${user.email}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`[statement-email] Sent to ${user.email}: id=${data?.id}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[statement-email] Error for ${user.email}:`, err.message);
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// GET ALL USERS WITH EMAIL
// ═══════════════════════════════════════════════════════════════

export async function getActiveUsersWithEmail(): Promise<StatementUser[]> {
  const redis = getRedis();
  const users: StatementUser[] = [];

  try {
    // Scan for all user balance keys
    let cursor: number = 0;
    const seen = new Set<string>();

    // Use SCAN to find user keys — look for user:0x...:balance pattern
    do {
      const result: [string, string[]] = await redis.scan(cursor, { match: 'user:0x*:balance', count: 100 }) as any;
      cursor = Number(result[0]);
      const keys = result[1] as string[];

      for (const key of keys) {
        // Extract address from key pattern user:{address}:balance
        const match = key.match(/^user:(0x[a-f0-9]+):balance$/i);
        if (!match) continue;

        const address = match[1].toLowerCase();
        if (seen.has(address)) continue;
        seen.add(address);

        // Get user data from various sources
        const userId = await redis.get(`user:address:${address}`) as string;
        let email = '';
        let name = 'Client';
        let language = 'en';

        if (userId) {
          const userData = await redis.hgetall(`user:${userId}`) as Record<string, string>;
          if (userData) {
            email = userData.email || '';
            name = userData.name || userData.firstName || 'Client';
            language = userData.language || userData.communicationLanguage || 'en';
          }
        }

        // Also check KYC for name
        if (name === 'Client') {
          const kyc = await redis.get(`kyc:${address}`) as any;
          if (kyc?.personalInfo) {
            name = [kyc.personalInfo.firstName, kyc.personalInfo.lastName].filter(Boolean).join(' ') || 'Client';
          }
        }

        if (email) {
          users.push({ address, email, name, language });
        }
      }
    } while (cursor !== 0);

  } catch (error) {
    console.error('[statement-email] Error fetching users:', error);
  }

  return users;
}
