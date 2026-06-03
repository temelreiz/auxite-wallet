// src/lib/timezones.ts
// Resolve a user's IANA timezone from (in order): explicit ISO-2 country,
// phone E.164 prefix, then language. Used by hourly notification crons that
// want to deliver at the user's *local* clock time.

// ── ISO-2 country → IANA timezone ────────────────────────────────────────────
const COUNTRY_TZ: Record<string, string> = {
  // Europe
  TR: "Europe/Istanbul", GB: "Europe/London", UK: "Europe/London",
  DE: "Europe/Berlin", FR: "Europe/Paris", NL: "Europe/Amsterdam",
  IT: "Europe/Rome", ES: "Europe/Madrid", PT: "Europe/Lisbon",
  IE: "Europe/Dublin", BE: "Europe/Brussels", CH: "Europe/Zurich",
  AT: "Europe/Vienna", PL: "Europe/Warsaw", CZ: "Europe/Prague",
  SE: "Europe/Stockholm", NO: "Europe/Oslo", FI: "Europe/Helsinki",
  DK: "Europe/Copenhagen", GR: "Europe/Athens", RO: "Europe/Bucharest",
  HU: "Europe/Budapest", BG: "Europe/Sofia", HR: "Europe/Zagreb",
  // CIS / RU
  RU: "Europe/Moscow", UA: "Europe/Kyiv", BY: "Europe/Minsk",
  KZ: "Asia/Almaty", UZ: "Asia/Tashkent", AZ: "Asia/Baku",
  AM: "Asia/Yerevan", GE: "Asia/Tbilisi", KG: "Asia/Bishkek",
  TJ: "Asia/Dushanbe", TM: "Asia/Ashgabat", MD: "Europe/Chisinau",
  // MENA
  SA: "Asia/Riyadh", AE: "Asia/Dubai", EG: "Africa/Cairo",
  IR: "Asia/Tehran", IQ: "Asia/Baghdad", JO: "Asia/Amman",
  LB: "Asia/Beirut", SY: "Asia/Damascus", PS: "Asia/Gaza",
  IL: "Asia/Jerusalem", YE: "Asia/Aden", OM: "Asia/Muscat",
  KW: "Asia/Kuwait", QA: "Asia/Qatar", BH: "Asia/Bahrain",
  MA: "Africa/Casablanca", DZ: "Africa/Algiers", TN: "Africa/Tunis",
  LY: "Africa/Tripoli", SD: "Africa/Khartoum",
  // Asia
  IN: "Asia/Kolkata", PK: "Asia/Karachi", BD: "Asia/Dhaka",
  CN: "Asia/Shanghai", JP: "Asia/Tokyo", KR: "Asia/Seoul",
  ID: "Asia/Jakarta", MY: "Asia/Kuala_Lumpur", SG: "Asia/Singapore",
  PH: "Asia/Manila", TH: "Asia/Bangkok", VN: "Asia/Ho_Chi_Minh",
  AF: "Asia/Kabul", LK: "Asia/Colombo",
  // Americas
  US: "America/New_York", CA: "America/Toronto", MX: "America/Mexico_City",
  BR: "America/Sao_Paulo", AR: "America/Argentina/Buenos_Aires",
  CL: "America/Santiago", CO: "America/Bogota", PE: "America/Lima",
  VE: "America/Caracas",
  // Oceania / Africa
  AU: "Australia/Sydney", NZ: "Pacific/Auckland",
  ZA: "Africa/Johannesburg", NG: "Africa/Lagos", KE: "Africa/Nairobi",
  ET: "Africa/Addis_Ababa", GH: "Africa/Accra",
};

// ── Phone E.164 prefix → ISO-2 (greedy match; longest prefix wins) ──────────
const PHONE_PREFIX_COUNTRY: Record<string, string> = {
  "90": "TR", "44": "GB", "49": "DE", "33": "FR", "31": "NL",
  "39": "IT", "34": "ES", "351": "PT", "353": "IE", "32": "BE",
  "41": "CH", "43": "AT", "48": "PL", "420": "CZ", "46": "SE",
  "47": "NO", "358": "FI", "45": "DK", "30": "GR", "40": "RO",
  "36": "HU", "359": "BG", "385": "HR",
  "7": "RU", "380": "UA", "375": "BY", "77": "KZ", "998": "UZ",
  "994": "AZ", "374": "AM", "995": "GE", "996": "KG", "992": "TJ",
  "993": "TM", "373": "MD",
  "966": "SA", "971": "AE", "20": "EG", "98": "IR", "964": "IQ",
  "962": "JO", "961": "LB", "963": "SY", "970": "PS", "972": "IL",
  "967": "YE", "968": "OM", "965": "KW", "974": "QA", "973": "BH",
  "212": "MA", "213": "DZ", "216": "TN", "218": "LY", "249": "SD",
  "91": "IN", "92": "PK", "880": "BD", "86": "CN", "81": "JP",
  "82": "KR", "62": "ID", "60": "MY", "65": "SG", "63": "PH",
  "66": "TH", "84": "VN", "93": "AF", "94": "LK",
  "1": "US", "52": "MX", "55": "BR", "54": "AR",
  "56": "CL", "57": "CO", "51": "PE", "58": "VE",
  "61": "AU", "64": "NZ",
  "27": "ZA", "234": "NG", "254": "KE", "251": "ET", "233": "GH",
};

// ── Language → representative timezone (last-resort fallback) ───────────────
const LANG_TZ: Record<string, string> = {
  tr: "Europe/Istanbul",
  ar: "Asia/Riyadh",
  ru: "Europe/Moscow",
  fr: "Europe/Paris",
  de: "Europe/Berlin",
  en: "Etc/UTC",
};

export function countryToTimezone(country?: string | null): string | null {
  if (!country) return null;
  const k = String(country).trim().toUpperCase();
  return COUNTRY_TZ[k] || null;
}

export function phoneToCountry(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/^\++/, "").replace(/[^\d]/g, "");
  if (!digits) return null;
  // try longest prefix (1-4 digits)
  for (const len of [4, 3, 2, 1]) {
    const code = PHONE_PREFIX_COUNTRY[digits.slice(0, len)];
    if (code) return code;
  }
  return null;
}

export function languageToTimezone(lang?: string | null): string {
  if (!lang) return "Etc/UTC";
  return LANG_TZ[String(lang).toLowerCase()] || "Etc/UTC";
}

export function resolveUserTimezone(u: {
  country?: string | null;
  phone?: string | null;
  language?: string | null;
}): string {
  return (
    countryToTimezone(u.country) ||
    countryToTimezone(phoneToCountry(u.phone)) ||
    languageToTimezone(u.language)
  );
}

// Current hour 0-23 in the given timezone.
export function getLocalHour(timezone: string, now?: Date): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: timezone,
  });
  return parseInt(fmt.format(now || new Date()), 10);
}
