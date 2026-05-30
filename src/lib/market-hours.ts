// src/lib/market-hours.ts
// Precious metals market hours detection (LBMA-based)
// Market opens Sunday 22:00 UTC (Monday 01:00 Turkey time)
// Market closes Friday 21:00 UTC (Saturday 00:00 Turkey time)

export interface MarketStatus {
  open: boolean;
  label: string;
}

// Major holidays that close precious metals markets (month is 0-indexed)
function getHolidays(year: number): Date[] {
  const holidays: Date[] = [];

  // New Year's Day - January 1
  holidays.push(new Date(Date.UTC(year, 0, 1)));

  // Christmas Day - December 25
  holidays.push(new Date(Date.UTC(year, 11, 25)));

  // Boxing Day - December 26
  holidays.push(new Date(Date.UTC(year, 11, 26)));

  // Good Friday & Easter Monday
  const easter = computeEasterDate(year);
  const goodFriday = new Date(easter);
  goodFriday.setUTCDate(goodFriday.getUTCDate() - 2);
  holidays.push(goodFriday);

  const easterMonday = new Date(easter);
  easterMonday.setUTCDate(easterMonday.getUTCDate() + 1);
  holidays.push(easterMonday);

  return holidays;
}

function computeEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(Date.UTC(year, month - 1, day));
}

function isHoliday(date: Date): boolean {
  const year = date.getUTCFullYear();
  const holidays = getHolidays(year);

  const dateStr = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;

  return holidays.some((h) => {
    const hStr = `${h.getUTCFullYear()}-${h.getUTCMonth()}-${h.getUTCDate()}`;
    return dateStr === hStr;
  });
}

/**
 * Check if the precious metals market is currently open.
 *
 * Market schedule (UTC):
 * - Opens: Sunday 22:00 UTC (Monday 01:00 Turkey time)
 * - Closes: Friday 21:00 UTC (Saturday 00:00 Turkey time)
 * - Also closed on major holidays
 */
export function isMarketOpen(_now?: Date): boolean {
  // KuveytTürk publishes precious-metal rates 7 days a week (incl. weekends
  // and Turkish/holidays), and our trade pricing is KT-primary. So from the
  // platform's perspective the metals market is always open. The previous
  // London/NY weekend close + holiday calendar was a leftover from when we
  // relied solely on a forex-style spot feed. Returning `true` here also
  // disables the weekend-order queueing path and lets trades execute live
  // every day.
  return true;
}

/**
 * Get market status with label.
 */
export function getMarketStatus(_now?: Date): MarketStatus {
  // KT-driven 7/24 pricing (see isMarketOpen).
  return { open: true, label: "Live Market Prices" };
}

/**
 * Determine the price type string for API responses.
 */
export function getPriceType(_now?: Date): "live" | "weekend" | "holiday" {
  // KT-driven 7/24 pricing (see isMarketOpen).
  return "live";
}
