// Country detection utility using browser APIs and IP geolocation

export interface CountryInfo {
  countryCode: string;
  countryName: string;
  currency: string;
}

// Map of country codes to currencies
const countryCurrencyMap: Record<string, string> = {
  BR: 'BRL',
  US: 'USD',
  GB: 'USD', // Use USD for UK users
  ES: 'USD',
  PT: 'USD',
  MX: 'USD',
  AR: 'USD',
  CO: 'USD',
  CL: 'USD',
  PE: 'USD',
  // Default to USD for all other countries
};

// Map of country codes to names
const countryNameMap: Record<string, string> = {
  BR: 'Brazil',
  US: 'United States',
  GB: 'United Kingdom',
  ES: 'Spain',
  PT: 'Portugal',
  MX: 'Mexico',
  AR: 'Argentina',
  CO: 'Colombia',
  CL: 'Chile',
  PE: 'Peru',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  CA: 'Canada',
  AU: 'Australia',
  JP: 'Japan',
  IN: 'India',
  CN: 'China',
  RU: 'Russia',
  ZA: 'South Africa',
  NG: 'Nigeria',
  EG: 'Egypt',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  KR: 'South Korea',
  SG: 'Singapore',
  MY: 'Malaysia',
  ID: 'Indonesia',
  TH: 'Thailand',
  VN: 'Vietnam',
  PH: 'Philippines',
  PK: 'Pakistan',
  BD: 'Bangladesh',
  TR: 'Turkey',
  PL: 'Poland',
  NL: 'Netherlands',
  BE: 'Belgium',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  AT: 'Austria',
  CH: 'Switzerland',
  IE: 'Ireland',
  NZ: 'New Zealand',
  IL: 'Israel',
  GR: 'Greece',
  CZ: 'Czech Republic',
  RO: 'Romania',
  HU: 'Hungary',
  UA: 'Ukraine',
  VE: 'Venezuela',
  EC: 'Ecuador',
  BO: 'Bolivia',
  PY: 'Paraguay',
  UY: 'Uruguay',
  CR: 'Costa Rica',
  PA: 'Panama',
  DO: 'Dominican Republic',
  GT: 'Guatemala',
  HN: 'Honduras',
  SV: 'El Salvador',
  NI: 'Nicaragua',
  CU: 'Cuba',
  PR: 'Puerto Rico',
};

// Detect country from browser timezone
function getCountryFromTimezone(): string | null {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Map common timezones to country codes
    const timezoneCountryMap: Record<string, string> = {
      'America/Sao_Paulo': 'BR',
      'America/Fortaleza': 'BR',
      'America/Recife': 'BR',
      'America/Bahia': 'BR',
      'America/Belem': 'BR',
      'America/Manaus': 'BR',
      'America/Cuiaba': 'BR',
      'America/Campo_Grande': 'BR',
      'America/Porto_Velho': 'BR',
      'America/Boa_Vista': 'BR',
      'America/Rio_Branco': 'BR',
      'America/New_York': 'US',
      'America/Los_Angeles': 'US',
      'America/Chicago': 'US',
      'America/Denver': 'US',
      'America/Phoenix': 'US',
      'America/Anchorage': 'US',
      'Pacific/Honolulu': 'US',
      'Europe/London': 'GB',
      'Europe/Madrid': 'ES',
      'Europe/Lisbon': 'PT',
      'America/Mexico_City': 'MX',
      'America/Buenos_Aires': 'AR',
      'America/Bogota': 'CO',
      'America/Santiago': 'CL',
      'America/Lima': 'PE',
      'Europe/Berlin': 'DE',
      'Europe/Paris': 'FR',
      'Europe/Rome': 'IT',
      'America/Toronto': 'CA',
      'Australia/Sydney': 'AU',
      'Asia/Tokyo': 'JP',
      'Asia/Kolkata': 'IN',
      'Asia/Shanghai': 'CN',
      'Europe/Moscow': 'RU',
      'Africa/Johannesburg': 'ZA',
      'Africa/Lagos': 'NG',
      'Africa/Cairo': 'EG',
      'Asia/Dubai': 'AE',
      'Asia/Riyadh': 'SA',
      'Asia/Seoul': 'KR',
      'Asia/Singapore': 'SG',
      'Asia/Kuala_Lumpur': 'MY',
      'Asia/Jakarta': 'ID',
      'Asia/Bangkok': 'TH',
      'Asia/Ho_Chi_Minh': 'VN',
      'Asia/Manila': 'PH',
    };
    
    return timezoneCountryMap[timezone] || null;
  } catch {
    return null;
  }
}

// Detect country from browser language
function getCountryFromLanguage(): string | null {
  try {
    const language = navigator.language || navigator.languages?.[0];
    if (!language) return null;
    
    // Parse language tag (e.g., 'pt-BR', 'en-US', 'es-MX')
    const parts = language.split('-');
    if (parts.length >= 2) {
      const countryCode = parts[1].toUpperCase();
      if (countryNameMap[countryCode]) {
        return countryCode;
      }
    }
    
    // Fallback: map language to most common country
    const langCode = parts[0].toLowerCase();
    const langToCountry: Record<string, string> = {
      pt: 'BR',
      en: 'US',
      es: 'ES',
      de: 'DE',
      fr: 'FR',
      it: 'IT',
      ja: 'JP',
      ko: 'KR',
      zh: 'CN',
      ru: 'RU',
      ar: 'AE',
      hi: 'IN',
    };
    
    return langToCountry[langCode] || null;
  } catch {
    return null;
  }
}

// Fetch country from IP geolocation API (free service)
async function getCountryFromIP(): Promise<{ countryCode: string; countryName: string } | null> {
  try {
    // Using ipapi.co free tier (1000 requests/day)
    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    if (!response.ok) {
      throw new Error('IP API failed');
    }
    
    const data = await response.json();
    
    if (data.country_code && data.country_name) {
      return {
        countryCode: data.country_code,
        countryName: data.country_name,
      };
    }
    
    return null;
  } catch (error) {
    console.warn('IP geolocation failed:', error);
    return null;
  }
}

// Main function to detect country
export async function detectUserCountry(): Promise<CountryInfo> {
  // Try IP geolocation first (most accurate)
  const ipResult = await getCountryFromIP();
  if (ipResult) {
    return {
      countryCode: ipResult.countryCode,
      countryName: ipResult.countryName,
      currency: countryCurrencyMap[ipResult.countryCode] || 'USD',
    };
  }
  
  // Fallback to timezone detection
  const timezoneCountry = getCountryFromTimezone();
  if (timezoneCountry) {
    return {
      countryCode: timezoneCountry,
      countryName: countryNameMap[timezoneCountry] || timezoneCountry,
      currency: countryCurrencyMap[timezoneCountry] || 'USD',
    };
  }
  
  // Fallback to language detection
  const langCountry = getCountryFromLanguage();
  if (langCountry) {
    return {
      countryCode: langCountry,
      countryName: countryNameMap[langCountry] || langCountry,
      currency: countryCurrencyMap[langCountry] || 'USD',
    };
  }
  
  // Default to unknown
  return {
    countryCode: 'XX',
    countryName: 'Unknown',
    currency: 'USD',
  };
}

// Get currency for country code
export function getCurrencyForCountry(countryCode: string): string {
  return countryCurrencyMap[countryCode] || 'USD';
}

// Check if country is Brazil
export function isBrazil(countryCode: string): boolean {
  return countryCode === 'BR';
}
