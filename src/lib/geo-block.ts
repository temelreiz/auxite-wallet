// src/lib/geo-block.ts
//
// Countries and regions the API refuses, used by src/middleware.ts.

// ISO-3166 alpha-2 codes for the click-farm cohort observed in
// Firebase Analytics. Easy to extend.
const FRAUD_COUNTRIES = [
  'BD', // Bangladesh
  'NP', // Nepal
  'ET', // Ethiopia
  'DZ', // Algeria
  'SD', // Sudan
  'TD', // Chad
  'CD', // Congo-Kinshasa
  'VE', // Venezuela
  'IN', // India
  'PK', // Pakistan (frequently same fraud rings)
  'NG', // Nigeria
];

// Prohibited Jurisdictions in the Sanctions Compliance Policy (section 6).
// Keep in step with that document.
const SANCTIONED_COUNTRIES = [
  'CU', // Cuba
  'IR', // Iran
  'KP', // North Korea
  'SY', // Syria
  'RU', // Russia
  'BY', // Belarus
  'MM', // Myanmar
];

const BLOCKED_COUNTRIES = new Set([...FRAUD_COUNTRIES, ...SANCTIONED_COUNTRIES]);

// ISO-3166-2 subdivisions of Ukraine named in the same policy section.
const SANCTIONED_UA_REGIONS = new Set([
  '43', // Crimea
  '40', // Sevastopol
  '14', // Donetsk
  '09', // Luhansk
  '23', // Zaporizhzhia
  '65', // Kherson
]);

export function isGeoBlocked(country: string | null, region: string | null): boolean {
  const c = (country || '').toUpperCase();
  if (BLOCKED_COUNTRIES.has(c)) return true;
  return c === 'UA' && SANCTIONED_UA_REGIONS.has((region || '').toUpperCase());
}
