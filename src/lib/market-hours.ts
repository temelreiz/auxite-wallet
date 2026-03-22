// src/lib/market-hours.ts
// Precious metals market hours detection (LBMA-based)
// Market is OPEN Monday-Friday (UTC), CLOSED Saturday-Sunday and major holidays

export interface MarketStatus {
  open: boolean;
  nextOpen: Date;
  label: string;
}

// Major holidays that close precious metals markets (month is 0-indexed)
// Static holidays: Christmas Day, New Year's Day, Boxing Day
// Dynamic holidays: Good Friday, Easter Monday (computed per year)
function getHolidays(year: number): Date[] {
  const holidays: Date[] = [];

  // New Year's Day - January 1
  holidays.push(new Date(Date.UTC(year, 0, 1)));

  // Christmas Day - December 25
  holidays.push(new Date(Date.UTC(year, 11, 25)));

  // Boxing Day - December 26
  holidays.push(new Date(Date.UTC(year, 11, 26)));

  // Good Friday & Easter Monday (computed via anonymous Gregorian algorithm)
  const easter = computeEasterDate(year);
  // Good Friday = Easter - 2 days
  const goodFriday = new Date(easter);
  goodFriday.setUTCDate(goodFriday.getUTCDate() - 2);
  holidays.push(goodFriday);

  // Easter Monday = Easter + 1 day
  const easterMonday = new Date(easter);
  easterMonday.setUTCDate(easterMonday.getUTCDate() + 1);
  holidays.push(easterMonday);

  return holidays;
}

/**
 * Compute Easter Sunday using the Anonymous Gregorian algorithm
 */
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
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Check if a given date (UTC) falls on a market holiday
 */
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
 * Market is open Monday (1) through Friday (5) UTC, excluding holidays.
 */
export function isMarketOpen(now?: Date): boolean {
  const date = now || new Date();
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 6 = Saturday

  // Weekend check
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // Holiday check
  if (isHoliday(date)) {
    return false;
  }

  return true;
}

/**
 * Find the next market open date from a given date.
 * Skips weekends and holidays.
 */
function findNextOpenDate(from: Date): Date {
  const next = new Date(from);

  // Start from the next day at 22:00 UTC (01:00 Turkey time = market open)
  next.setUTCDate(next.getUTCDate());
  next.setUTCHours(22, 0, 0, 0);

  // If we're already past 22:00 UTC today, move to next day
  if (next <= from) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  // Advance until we find a weekday that is not a holiday (max 10 days safety)
  for (let i = 0; i < 10; i++) {
    const day = next.getUTCDay();
    if (day !== 0 && day !== 6 && !isHoliday(next)) {
      return next;
    }
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next;
}

/**
 * Get detailed market status including label and next open time.
 */
export function getMarketStatus(now?: Date): MarketStatus {
  const date = now || new Date();
  const dayOfWeek = date.getUTCDay();

  // Check weekend
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      open: false,
      nextOpen: findNextOpenDate(date),
      label: "Weekend Prices Applied",
    };
  }

  // Check holiday
  if (isHoliday(date)) {
    return {
      open: false,
      nextOpen: findNextOpenDate(date),
      label: "Holiday Prices Applied",
    };
  }

  // Market is open
  return {
    open: true,
    nextOpen: date, // Already open
    label: "Live Market Prices",
  };
}

/**
 * Determine the price type string for API responses.
 */
export function getPriceType(now?: Date): "live" | "weekend" | "holiday" {
  const date = now || new Date();
  const dayOfWeek = date.getUTCDay();

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return "weekend";
  }

  if (isHoliday(date)) {
    return "holiday";
  }

  return "live";
}
