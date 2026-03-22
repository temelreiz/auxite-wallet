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
export function isMarketOpen(now?: Date): boolean {
  const date = now || new Date();
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const hour = date.getUTCHours();

  // Saturday: always closed
  if (dayOfWeek === 6) {
    return false;
  }

  // Sunday: closed until 22:00 UTC
  if (dayOfWeek === 0) {
    return hour >= 22;
  }

  // Friday: closed after 21:00 UTC
  if (dayOfWeek === 5 && hour >= 21) {
    return false;
  }

  // Monday-Friday (before Friday 21:00): check holidays
  if (isHoliday(date)) {
    return false;
  }

  return true;
}

/**
 * Get market status with label.
 */
export function getMarketStatus(now?: Date): MarketStatus {
  const date = now || new Date();
  const dayOfWeek = date.getUTCDay();

  // Check weekend
  if (dayOfWeek === 6 || (dayOfWeek === 0 && date.getUTCHours() < 22)) {
    return {
      open: false,
      label: "Weekend Prices Applied",
    };
  }

  // Friday after close
  if (dayOfWeek === 5 && date.getUTCHours() >= 21) {
    return {
      open: false,
      label: "Weekend Prices Applied",
    };
  }

  // Check holiday
  if (isHoliday(date)) {
    return {
      open: false,
      label: "Holiday Prices Applied",
    };
  }

  // Market is open
  return {
    open: true,
    label: "Live Market Prices",
  };
}

/**
 * Determine the price type string for API responses.
 */
export function getPriceType(now?: Date): "live" | "weekend" | "holiday" {
  const date = now || new Date();
  const dayOfWeek = date.getUTCDay();

  if (dayOfWeek === 6 || (dayOfWeek === 0 && date.getUTCHours() < 22)) {
    return "weekend";
  }

  if (dayOfWeek === 5 && date.getUTCHours() >= 21) {
    return "weekend";
  }

  if (isHoliday(date)) {
    return "holiday";
  }

  return "live";
}
