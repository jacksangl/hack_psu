export interface CountryInfo {
  code: string;
  name: string;
  lat: number;
  lng: number;
  flag: string;
}

export const COUNTRIES: CountryInfo[] = [
  // North America
  { code: "US", name: "United States", lat: 37.09, lng: -95.71, flag: "🇺🇸" },
  { code: "CA", name: "Canada", lat: 56.13, lng: -106.35, flag: "🇨🇦" },
  { code: "MX", name: "Mexico", lat: 23.63, lng: -102.55, flag: "🇲🇽" },
  { code: "GT", name: "Guatemala", lat: 15.78, lng: -90.23, flag: "🇬🇹" },
  { code: "BZ", name: "Belize", lat: 17.19, lng: -88.5, flag: "🇧🇿" },
  { code: "HN", name: "Honduras", lat: 15.2, lng: -86.24, flag: "🇭🇳" },
  { code: "SV", name: "El Salvador", lat: 13.79, lng: -88.9, flag: "🇸🇻" },
  { code: "NI", name: "Nicaragua", lat: 12.87, lng: -85.21, flag: "🇳🇮" },
  { code: "CR", name: "Costa Rica", lat: 9.75, lng: -83.75, flag: "🇨🇷" },
  { code: "PA", name: "Panama", lat: 8.54, lng: -80.78, flag: "🇵🇦" },
  { code: "CU", name: "Cuba", lat: 21.52, lng: -77.78, flag: "🇨🇺" },
  { code: "JM", name: "Jamaica", lat: 18.11, lng: -77.3, flag: "🇯🇲" },
  { code: "HT", name: "Haiti", lat: 18.97, lng: -72.29, flag: "🇭🇹" },
  { code: "DO", name: "Dominican Republic", lat: 18.74, lng: -70.16, flag: "🇩🇴" },
  { code: "TT", name: "Trinidad and Tobago", lat: 10.69, lng: -61.22, flag: "🇹🇹" },
  { code: "BS", name: "Bahamas", lat: 25.03, lng: -77.4, flag: "🇧🇸" },
  { code: "BB", name: "Barbados", lat: 13.19, lng: -59.54, flag: "🇧🇧" },
  { code: "PR", name: "Puerto Rico", lat: 18.22, lng: -66.59, flag: "🇵🇷" },

  // South America
  { code: "BR", name: "Brazil", lat: -14.24, lng: -51.93, flag: "🇧🇷" },
  { code: "AR", name: "Argentina", lat: -38.42, lng: -63.62, flag: "🇦🇷" },
  { code: "CO", name: "Colombia", lat: 4.57, lng: -74.3, flag: "🇨🇴" },
  { code: "CL", name: "Chile", lat: -35.68, lng: -71.54, flag: "🇨🇱" },
  { code: "PE", name: "Peru", lat: -9.19, lng: -75.02, flag: "🇵🇪" },
  { code: "VE", name: "Venezuela", lat: 6.42, lng: -66.59, flag: "🇻🇪" },
  { code: "EC", name: "Ecuador", lat: -1.83, lng: -78.18, flag: "🇪🇨" },
  { code: "BO", name: "Bolivia", lat: -16.29, lng: -63.59, flag: "🇧🇴" },
  { code: "PY", name: "Paraguay", lat: -23.44, lng: -58.44, flag: "🇵🇾" },
  { code: "UY", name: "Uruguay", lat: -32.52, lng: -55.77, flag: "🇺🇾" },
  { code: "GY", name: "Guyana", lat: 4.86, lng: -58.93, flag: "🇬🇾" },
  { code: "SR", name: "Suriname", lat: 3.92, lng: -56.03, flag: "🇸🇷" },

  // Europe
  { code: "GB", name: "United Kingdom", lat: 55.38, lng: -3.44, flag: "🇬🇧" },
  { code: "FR", name: "France", lat: 46.23, lng: 2.21, flag: "🇫🇷" },
  { code: "DE", name: "Germany", lat: 51.17, lng: 10.45, flag: "🇩🇪" },
  { code: "IT", name: "Italy", lat: 41.87, lng: 12.57, flag: "🇮🇹" },
  { code: "ES", name: "Spain", lat: 40.46, lng: -3.75, flag: "🇪🇸" },
  { code: "PT", name: "Portugal", lat: 39.4, lng: -8.22, flag: "🇵🇹" },
  { code: "NL", name: "Netherlands", lat: 52.13, lng: 5.29, flag: "🇳🇱" },
  { code: "BE", name: "Belgium", lat: 50.5, lng: 4.47, flag: "🇧🇪" },
  { code: "CH", name: "Switzerland", lat: 46.82, lng: 8.23, flag: "🇨🇭" },
  { code: "AT", name: "Austria", lat: 47.52, lng: 14.55, flag: "🇦🇹" },
  { code: "SE", name: "Sweden", lat: 60.13, lng: 18.64, flag: "🇸🇪" },
  { code: "NO", name: "Norway", lat: 60.47, lng: 8.47, flag: "🇳🇴" },
  { code: "DK", name: "Denmark", lat: 56.26, lng: 9.5, flag: "🇩🇰" },
  { code: "FI", name: "Finland", lat: 61.92, lng: 25.75, flag: "🇫🇮" },
  { code: "IS", name: "Iceland", lat: 64.96, lng: -19.02, flag: "🇮🇸" },
  { code: "IE", name: "Ireland", lat: 53.41, lng: -8.24, flag: "🇮🇪" },
  { code: "PL", name: "Poland", lat: 51.92, lng: 19.15, flag: "🇵🇱" },
  { code: "CZ", name: "Czech Republic", lat: 49.82, lng: 15.47, flag: "🇨🇿" },
  { code: "SK", name: "Slovakia", lat: 48.67, lng: 19.7, flag: "🇸🇰" },
  { code: "HU", name: "Hungary", lat: 47.16, lng: 19.5, flag: "🇭🇺" },
  { code: "RO", name: "Romania", lat: 45.94, lng: 24.97, flag: "🇷🇴" },
  { code: "BG", name: "Bulgaria", lat: 42.73, lng: 25.49, flag: "🇧🇬" },
  { code: "GR", name: "Greece", lat: 39.07, lng: 21.82, flag: "🇬🇷" },
  { code: "HR", name: "Croatia", lat: 45.1, lng: 15.2, flag: "🇭🇷" },
  { code: "RS", name: "Serbia", lat: 44.02, lng: 21.01, flag: "🇷🇸" },
  { code: "BA", name: "Bosnia and Herzegovina", lat: 43.92, lng: 17.68, flag: "🇧🇦" },
  { code: "ME", name: "Montenegro", lat: 42.71, lng: 19.37, flag: "🇲🇪" },
  { code: "MK", name: "North Macedonia", lat: 41.61, lng: 21.75, flag: "🇲🇰" },
  { code: "AL", name: "Albania", lat: 41.15, lng: 20.17, flag: "🇦🇱" },
  { code: "XK", name: "Kosovo", lat: 42.6, lng: 20.9, flag: "🇽🇰" },
  { code: "SI", name: "Slovenia", lat: 46.15, lng: 15.0, flag: "🇸🇮" },
  { code: "EE", name: "Estonia", lat: 58.6, lng: 25.01, flag: "🇪🇪" },
  { code: "LV", name: "Latvia", lat: 56.88, lng: 24.6, flag: "🇱🇻" },
  { code: "LT", name: "Lithuania", lat: 55.17, lng: 23.88, flag: "🇱🇹" },
  { code: "UA", name: "Ukraine", lat: 48.38, lng: 31.17, flag: "🇺🇦" },
  { code: "BY", name: "Belarus", lat: 53.71, lng: 27.95, flag: "🇧🇾" },
  { code: "MD", name: "Moldova", lat: 47.41, lng: 28.37, flag: "🇲🇩" },
  { code: "RU", name: "Russia", lat: 61.52, lng: 105.32, flag: "🇷🇺" },
  { code: "CY", name: "Cyprus", lat: 35.13, lng: 33.43, flag: "🇨🇾" },
  { code: "MT", name: "Malta", lat: 35.94, lng: 14.38, flag: "🇲🇹" },
  { code: "LU", name: "Luxembourg", lat: 49.82, lng: 6.13, flag: "🇱🇺" },
  { code: "GE", name: "Georgia", lat: 42.32, lng: 43.36, flag: "🇬🇪" },
  { code: "AM", name: "Armenia", lat: 40.07, lng: 45.04, flag: "🇦🇲" },
  { code: "AZ", name: "Azerbaijan", lat: 40.14, lng: 47.58, flag: "🇦🇿" },

  // Middle East
  { code: "TR", name: "Turkey", lat: 38.96, lng: 35.24, flag: "🇹🇷" },
  { code: "IL", name: "Israel", lat: 31.05, lng: 34.85, flag: "🇮🇱" },
  { code: "PS", name: "Palestine", lat: 31.95, lng: 35.23, flag: "🇵🇸" },
  { code: "LB", name: "Lebanon", lat: 33.85, lng: 35.86, flag: "🇱🇧" },
  { code: "SY", name: "Syria", lat: 34.8, lng: 39.0, flag: "🇸🇾" },
  { code: "JO", name: "Jordan", lat: 30.59, lng: 36.24, flag: "🇯🇴" },
  { code: "IQ", name: "Iraq", lat: 33.22, lng: 43.68, flag: "🇮🇶" },
  { code: "IR", name: "Iran", lat: 32.43, lng: 53.69, flag: "🇮🇷" },
  { code: "SA", name: "Saudi Arabia", lat: 23.89, lng: 45.08, flag: "🇸🇦" },
  { code: "AE", name: "United Arab Emirates", lat: 23.42, lng: 53.85, flag: "🇦🇪" },
  { code: "QA", name: "Qatar", lat: 25.35, lng: 51.18, flag: "🇶🇦" },
  { code: "KW", name: "Kuwait", lat: 29.31, lng: 47.48, flag: "🇰🇼" },
  { code: "BH", name: "Bahrain", lat: 25.93, lng: 50.64, flag: "🇧🇭" },
  { code: "OM", name: "Oman", lat: 21.51, lng: 55.92, flag: "🇴🇲" },
  { code: "YE", name: "Yemen", lat: 15.55, lng: 48.52, flag: "🇾🇪" },

  // Central Asia
  { code: "KZ", name: "Kazakhstan", lat: 48.02, lng: 66.92, flag: "🇰🇿" },
  { code: "UZ", name: "Uzbekistan", lat: 41.38, lng: 64.59, flag: "🇺🇿" },
  { code: "TM", name: "Turkmenistan", lat: 38.97, lng: 59.56, flag: "🇹🇲" },
  { code: "TJ", name: "Tajikistan", lat: 38.86, lng: 71.28, flag: "🇹🇯" },
  { code: "KG", name: "Kyrgyzstan", lat: 41.2, lng: 74.77, flag: "🇰🇬" },
  { code: "AF", name: "Afghanistan", lat: 33.94, lng: 67.71, flag: "🇦🇫" },
  { code: "MN", name: "Mongolia", lat: 46.86, lng: 103.85, flag: "🇲🇳" },

  // South Asia
  { code: "IN", name: "India", lat: 20.59, lng: 78.96, flag: "🇮🇳" },
  { code: "PK", name: "Pakistan", lat: 30.38, lng: 69.35, flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", lat: 23.68, lng: 90.36, flag: "🇧🇩" },
  { code: "LK", name: "Sri Lanka", lat: 7.87, lng: 80.77, flag: "🇱🇰" },
  { code: "NP", name: "Nepal", lat: 28.39, lng: 84.12, flag: "🇳🇵" },
  { code: "BT", name: "Bhutan", lat: 27.51, lng: 90.43, flag: "🇧🇹" },
  { code: "MV", name: "Maldives", lat: 3.2, lng: 73.22, flag: "🇲🇻" },

  // East Asia
  { code: "CN", name: "China", lat: 35.86, lng: 104.2, flag: "🇨🇳" },
  { code: "JP", name: "Japan", lat: 36.2, lng: 138.25, flag: "🇯🇵" },
  { code: "KR", name: "South Korea", lat: 35.91, lng: 127.77, flag: "🇰🇷" },
  { code: "KP", name: "North Korea", lat: 40.34, lng: 127.51, flag: "🇰🇵" },
  { code: "TW", name: "Taiwan", lat: 23.7, lng: 120.96, flag: "🇹🇼" },
  { code: "HK", name: "Hong Kong", lat: 22.4, lng: 114.11, flag: "🇭🇰" },

  // Southeast Asia
  { code: "TH", name: "Thailand", lat: 15.87, lng: 100.99, flag: "🇹🇭" },
  { code: "VN", name: "Vietnam", lat: 14.06, lng: 108.28, flag: "🇻🇳" },
  { code: "ID", name: "Indonesia", lat: -0.79, lng: 113.92, flag: "🇮🇩" },
  { code: "PH", name: "Philippines", lat: 12.88, lng: 121.77, flag: "🇵🇭" },
  { code: "MY", name: "Malaysia", lat: 4.21, lng: 101.98, flag: "🇲🇾" },
  { code: "SG", name: "Singapore", lat: 1.35, lng: 103.82, flag: "🇸🇬" },
  { code: "MM", name: "Myanmar", lat: 21.91, lng: 95.96, flag: "🇲🇲" },
  { code: "KH", name: "Cambodia", lat: 12.57, lng: 104.99, flag: "🇰🇭" },
  { code: "LA", name: "Laos", lat: 19.86, lng: 102.5, flag: "🇱🇦" },
  { code: "BN", name: "Brunei", lat: 4.54, lng: 114.73, flag: "🇧🇳" },
  { code: "TL", name: "Timor-Leste", lat: -8.87, lng: 125.73, flag: "🇹🇱" },

  // Africa - North
  { code: "EG", name: "Egypt", lat: 26.82, lng: 30.8, flag: "🇪🇬" },
  { code: "LY", name: "Libya", lat: 26.34, lng: 17.23, flag: "🇱🇾" },
  { code: "TN", name: "Tunisia", lat: 33.89, lng: 9.54, flag: "🇹🇳" },
  { code: "DZ", name: "Algeria", lat: 28.03, lng: 1.66, flag: "🇩🇿" },
  { code: "MA", name: "Morocco", lat: 31.79, lng: -7.09, flag: "🇲🇦" },
  { code: "SD", name: "Sudan", lat: 12.86, lng: 30.22, flag: "🇸🇩" },
  { code: "SS", name: "South Sudan", lat: 6.88, lng: 31.31, flag: "🇸🇸" },

  // Africa - West
  { code: "NG", name: "Nigeria", lat: 9.08, lng: 8.68, flag: "🇳🇬" },
  { code: "GH", name: "Ghana", lat: 7.95, lng: -1.02, flag: "🇬🇭" },
  { code: "SN", name: "Senegal", lat: 14.5, lng: -14.45, flag: "🇸🇳" },
  { code: "CI", name: "Ivory Coast", lat: 7.54, lng: -5.55, flag: "🇨🇮" },
  { code: "ML", name: "Mali", lat: 17.57, lng: -4.0, flag: "🇲🇱" },
  { code: "BF", name: "Burkina Faso", lat: 12.24, lng: -1.56, flag: "🇧🇫" },
  { code: "NE", name: "Niger", lat: 17.61, lng: 8.08, flag: "🇳🇪" },
  { code: "GN", name: "Guinea", lat: 9.95, lng: -9.7, flag: "🇬🇳" },
  { code: "SL", name: "Sierra Leone", lat: 8.46, lng: -11.78, flag: "🇸🇱" },
  { code: "LR", name: "Liberia", lat: 6.43, lng: -9.43, flag: "🇱🇷" },
  { code: "TG", name: "Togo", lat: 8.62, lng: 0.82, flag: "🇹🇬" },
  { code: "BJ", name: "Benin", lat: 9.31, lng: 2.32, flag: "🇧🇯" },
  { code: "GM", name: "Gambia", lat: 13.44, lng: -15.31, flag: "🇬🇲" },
  { code: "GW", name: "Guinea-Bissau", lat: 11.8, lng: -15.18, flag: "🇬🇼" },
  { code: "MR", name: "Mauritania", lat: 21.01, lng: -10.94, flag: "🇲🇷" },
  { code: "CV", name: "Cape Verde", lat: 16.0, lng: -24.01, flag: "🇨🇻" },

  // Africa - East
  { code: "KE", name: "Kenya", lat: -0.02, lng: 37.91, flag: "🇰🇪" },
  { code: "ET", name: "Ethiopia", lat: 9.15, lng: 40.49, flag: "🇪🇹" },
  { code: "TZ", name: "Tanzania", lat: -6.37, lng: 34.89, flag: "🇹🇿" },
  { code: "UG", name: "Uganda", lat: 1.37, lng: 32.29, flag: "🇺🇬" },
  { code: "RW", name: "Rwanda", lat: -1.94, lng: 29.87, flag: "🇷🇼" },
  { code: "BI", name: "Burundi", lat: -3.37, lng: 29.92, flag: "🇧🇮" },
  { code: "SO", name: "Somalia", lat: 5.15, lng: 46.2, flag: "🇸🇴" },
  { code: "ER", name: "Eritrea", lat: 15.18, lng: 39.78, flag: "🇪🇷" },
  { code: "DJ", name: "Djibouti", lat: 11.83, lng: 42.59, flag: "🇩🇯" },
  { code: "MG", name: "Madagascar", lat: -18.77, lng: 46.87, flag: "🇲🇬" },
  { code: "MU", name: "Mauritius", lat: -20.35, lng: 57.55, flag: "🇲🇺" },
  { code: "SC", name: "Seychelles", lat: -4.68, lng: 55.49, flag: "🇸🇨" },
  { code: "KM", name: "Comoros", lat: -11.88, lng: 43.87, flag: "🇰🇲" },

  // Africa - Central
  { code: "CD", name: "DR Congo", lat: -4.04, lng: 21.76, flag: "🇨🇩" },
  { code: "CG", name: "Congo", lat: -0.23, lng: 15.83, flag: "🇨🇬" },
  { code: "CM", name: "Cameroon", lat: 7.37, lng: 12.35, flag: "🇨🇲" },
  { code: "CF", name: "Central African Republic", lat: 6.61, lng: 20.94, flag: "🇨🇫" },
  { code: "TD", name: "Chad", lat: 15.45, lng: 18.73, flag: "🇹🇩" },
  { code: "GA", name: "Gabon", lat: -0.8, lng: 11.61, flag: "🇬🇦" },
  { code: "GQ", name: "Equatorial Guinea", lat: 1.65, lng: 10.27, flag: "🇬🇶" },
  { code: "ST", name: "Sao Tome and Principe", lat: 0.19, lng: 6.61, flag: "🇸🇹" },

  // Africa - Southern
  { code: "ZA", name: "South Africa", lat: -30.56, lng: 22.94, flag: "🇿🇦" },
  { code: "AO", name: "Angola", lat: -11.2, lng: 17.87, flag: "🇦🇴" },
  { code: "MZ", name: "Mozambique", lat: -18.67, lng: 35.53, flag: "🇲🇿" },
  { code: "ZM", name: "Zambia", lat: -13.13, lng: 27.85, flag: "🇿🇲" },
  { code: "ZW", name: "Zimbabwe", lat: -19.02, lng: 29.15, flag: "🇿🇼" },
  { code: "MW", name: "Malawi", lat: -13.25, lng: 34.3, flag: "🇲🇼" },
  { code: "BW", name: "Botswana", lat: -22.33, lng: 24.68, flag: "🇧🇼" },
  { code: "NA", name: "Namibia", lat: -22.96, lng: 18.49, flag: "🇳🇦" },
  { code: "SZ", name: "Eswatini", lat: -26.52, lng: 31.47, flag: "🇸🇿" },
  { code: "LS", name: "Lesotho", lat: -29.61, lng: 28.23, flag: "🇱🇸" },

  // Oceania
  { code: "AU", name: "Australia", lat: -25.27, lng: 133.78, flag: "🇦🇺" },
  { code: "NZ", name: "New Zealand", lat: -40.9, lng: 174.89, flag: "🇳🇿" },
  { code: "PG", name: "Papua New Guinea", lat: -6.31, lng: 143.96, flag: "🇵🇬" },
  { code: "FJ", name: "Fiji", lat: -16.58, lng: 179.41, flag: "🇫🇯" },
  { code: "SB", name: "Solomon Islands", lat: -9.65, lng: 160.16, flag: "🇸🇧" },
  { code: "VU", name: "Vanuatu", lat: -15.38, lng: 166.96, flag: "🇻🇺" },
  { code: "WS", name: "Samoa", lat: -13.76, lng: -172.1, flag: "🇼🇸" },
  { code: "TO", name: "Tonga", lat: -21.18, lng: -175.2, flag: "🇹🇴" },
];

const countryMap = new Map<string, CountryInfo>();
for (const c of COUNTRIES) {
  countryMap.set(c.code, c);
}

export function getCountryByCode(code: string): CountryInfo | undefined {
  return countryMap.get(code);
}

export function searchCountries(query: string): CountryInfo[] {
  const lower = query.toLowerCase();
  return COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(lower) ||
      c.code.toLowerCase().includes(lower)
  );
}
