/**
 * GeoIP Utility Functions
 * IP adresinden lokasyon tespiti
 */

// Not: geoip-lite paketi offline database kullanır
// Alternatif: ip-api.com (free tier: 45 req/min) veya maxmind

/**
 * Lokasyon bilgisi interface
 */
export interface GeoLocation {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  isVpn?: boolean;
  isTor?: boolean;
  isProxy?: boolean;
}

/**
 * IP'den lokasyon bilgisi al (ip-api.com kullanarak)
 * Free tier: 45 requests per minute
 */
export async function getLocationByIP(ip: string): Promise<GeoLocation> {
  // Localhost veya private IP kontrolü
  if (isPrivateIP(ip)) {
    return {
      ip,
      city: 'Local',
      country: 'Local Network',
      countryCode: 'LO',
    };
  }

  try {
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,proxy,hosting,query`,
      { 
        next: { revalidate: 3600 }, // 1 saat cache
      }
    );

    const data = await response.json();

    if (data.status === 'fail') {
      console.error('GeoIP lookup failed:', data.message);
      return { ip };
    }

    return {
      ip: data.query || ip,
      city: data.city,
      region: data.regionName,
      country: data.country,
      countryCode: data.countryCode,
      timezone: data.timezone,
      latitude: data.lat,
      longitude: data.lon,
      isp: data.isp,
      isVpn: data.hosting || false, // Hosting/datacenter IP genelde VPN
      isProxy: data.proxy || false,
    };
  } catch (error) {
    console.error('GeoIP lookup error:', error);
    return { ip };
  }
}

/**
 * GeoIP Lite (offline database) kullanarak lokasyon al
 * Daha hızlı, rate limit yok
 */
export function getLocationByIPOffline(ip: string): GeoLocation {
  // geoip-lite paketi require ile çalışıyor
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const geoip = require('geoip-lite');
    const geo = geoip.lookup(ip);

    if (!geo) {
      return { ip };
    }

    return {
      ip,
      city: geo.city,
      region: geo.region,
      country: geo.country,
      countryCode: geo.country,
      timezone: geo.timezone,
      latitude: geo.ll?.[0],
      longitude: geo.ll?.[1],
    };
  } catch (error) {
    console.error('GeoIP offline lookup error:', error);
    return { ip };
  }
}

/**
 * Private/Local IP kontrolü
 */
export function isPrivateIP(ip: string): boolean {
  // IPv4 private ranges
  const privateRanges = [
    /^127\./, // Localhost
    /^10\./, // Class A private
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Class B private
    /^192\.168\./, // Class C private
    /^169\.254\./, // Link-local
    /^::1$/, // IPv6 localhost
    /^fe80:/i, // IPv6 link-local
    /^fc00:/i, // IPv6 unique local
    /^fd00:/i, // IPv6 unique local
  ];

  return privateRanges.some(range => range.test(ip));
}

/**
 * Tor exit node kontrolü (basit)
 */
export async function isTorExitNode(ip: string): Promise<boolean> {
  try {
    // Tor DNS exit list kontrolü
    const reversedIP = ip.split('.').reverse().join('.');
    const lookupHost = `${reversedIP}.dnsel.torproject.org`;
    
    // DNS lookup (Node.js)
    const dns = await import('dns').then(m => m.promises);
    
    try {
      await dns.resolve4(lookupHost);
      return true; // DNS kaydı varsa Tor exit node
    } catch {
      return false; // DNS kaydı yoksa normal IP
    }
  } catch {
    return false;
  }
}

/**
 * İki lokasyon arasındaki mesafeyi hesapla (km)
 * Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Dünya yarıçapı (km)
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Lokasyon değişikliği şüpheli mi kontrol et
 * (Örn: 1 saat içinde 1000km+ mesafe = impossible travel)
 */
export interface TravelCheck {
  isSuspicious: boolean;
  reason?: string;
  distance?: number;
  timeDiff?: number;
  maxPossibleSpeed?: number;
}

export function checkImpossibleTravel(
  previousLocation: GeoLocation,
  previousTimestamp: Date,
  currentLocation: GeoLocation,
  currentTimestamp: Date
): TravelCheck {
  // Koordinat yoksa kontrol yapma
  if (
    !previousLocation.latitude ||
    !previousLocation.longitude ||
    !currentLocation.latitude ||
    !currentLocation.longitude
  ) {
    return { isSuspicious: false };
  }

  const distance = calculateDistance(
    previousLocation.latitude,
    previousLocation.longitude,
    currentLocation.latitude,
    currentLocation.longitude
  );

  const timeDiffHours =
    (currentTimestamp.getTime() - previousTimestamp.getTime()) / (1000 * 60 * 60);

  // Maksimum makul hız: 900 km/h (uçak hızı)
  const maxPossibleSpeed = 900;
  const requiredSpeed = distance / timeDiffHours;

  if (requiredSpeed > maxPossibleSpeed) {
    return {
      isSuspicious: true,
      reason: `İmkansız seyahat: ${Math.round(distance)}km mesafe ${timeDiffHours.toFixed(1)} saatte`,
      distance,
      timeDiff: timeDiffHours,
      maxPossibleSpeed: requiredSpeed,
    };
  }

  return {
    isSuspicious: false,
    distance,
    timeDiff: timeDiffHours,
  };
}

/**
 * Risk skoru hesapla
 */
export function calculateLocationRiskScore(location: GeoLocation): number {
  let score = 0;

  // VPN/Proxy kullanımı
  if (location.isVpn) score += 30;
  if (location.isProxy) score += 40;
  if (location.isTor) score += 50;

  // Belirli yüksek riskli ülkeler (örnek)
  const highRiskCountries = ['KP', 'IR', 'CU', 'SY'];
  if (location.countryCode && highRiskCountries.includes(location.countryCode)) {
    score += 40;
  }

  return Math.min(100, score);
}

/**
 * Lokasyon özetini formatla
 */
export function formatLocation(location: GeoLocation): string {
  const parts = [];
  
  if (location.city) parts.push(location.city);
  if (location.region && location.region !== location.city) parts.push(location.region);
  if (location.countryCode) parts.push(location.countryCode);
  
  if (parts.length === 0) {
    return 'Bilinmeyen Lokasyon';
  }
  
  return parts.join(', ');
}

/**
 * IP maskeleme (privacy için)
 */
export function maskIP(ip: string): string {
  if (ip.includes(':')) {
    // IPv6
    const parts = ip.split(':');
    return `${parts.slice(0, 4).join(':')}:****:****:****:****`;
  }
  
  // IPv4
  const parts = ip.split('.');
  return `${parts[0]}.${parts[1]}.***.***`;
}
