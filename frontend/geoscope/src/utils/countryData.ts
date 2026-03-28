export interface CountryInfo {
  code: string;
  name: string;
  lat: number;
  lng: number;
  flag: string;
}

export const COUNTRIES: CountryInfo[] = [
  { code: "US", name: "United States", lat: 39.83, lng: -98.58, flag: "🇺🇸" },
  { code: "BR", name: "Brazil", lat: -14.24, lng: -51.93, flag: "🇧🇷" },
  { code: "IN", name: "India", lat: 20.59, lng: 78.96, flag: "🇮🇳" },
  { code: "DE", name: "Germany", lat: 51.17, lng: 10.45, flag: "🇩🇪" },
  { code: "CN", name: "China", lat: 35.86, lng: 104.2, flag: "🇨🇳" },
  { code: "NG", name: "Nigeria", lat: 9.08, lng: 8.68, flag: "🇳🇬" },
  { code: "UA", name: "Ukraine", lat: 48.38, lng: 31.17, flag: "🇺🇦" },
  { code: "AU", name: "Australia", lat: -25.27, lng: 133.78, flag: "🇦🇺" },
  { code: "GB", name: "United Kingdom", lat: 55.38, lng: -3.44, flag: "🇬🇧" },
  { code: "FR", name: "France", lat: 46.23, lng: 2.21, flag: "🇫🇷" },
  { code: "JP", name: "Japan", lat: 36.2, lng: 138.25, flag: "🇯🇵" },
  { code: "KR", name: "South Korea", lat: 35.91, lng: 127.77, flag: "🇰🇷" },
  { code: "CA", name: "Canada", lat: 56.13, lng: -106.35, flag: "🇨🇦" },
  { code: "MX", name: "Mexico", lat: 23.63, lng: -102.55, flag: "🇲🇽" },
  { code: "ZA", name: "South Africa", lat: -30.56, lng: 22.94, flag: "🇿🇦" },
  { code: "SA", name: "Saudi Arabia", lat: 23.89, lng: 45.08, flag: "🇸🇦" },
  { code: "RU", name: "Russia", lat: 61.52, lng: 105.32, flag: "🇷🇺" },
  { code: "IT", name: "Italy", lat: 41.87, lng: 12.57, flag: "🇮🇹" },
  { code: "ES", name: "Spain", lat: 40.46, lng: -3.75, flag: "🇪🇸" },
  { code: "TR", name: "Turkey", lat: 38.96, lng: 35.24, flag: "🇹🇷" },
  { code: "PL", name: "Poland", lat: 51.92, lng: 19.15, flag: "🇵🇱" },
  { code: "AR", name: "Argentina", lat: -38.42, lng: -63.62, flag: "🇦🇷" },
  { code: "EG", name: "Egypt", lat: 26.82, lng: 30.8, flag: "🇪🇬" },
  { code: "TH", name: "Thailand", lat: 15.87, lng: 100.99, flag: "🇹🇭" },
  { code: "ID", name: "Indonesia", lat: -0.79, lng: 113.92, flag: "🇮🇩" },
  { code: "PK", name: "Pakistan", lat: 30.38, lng: 69.35, flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", lat: 23.68, lng: 90.36, flag: "🇧🇩" },
  { code: "PH", name: "Philippines", lat: 12.88, lng: 121.77, flag: "🇵🇭" },
  { code: "VN", name: "Vietnam", lat: 14.06, lng: 108.28, flag: "🇻🇳" },
  { code: "ET", name: "Ethiopia", lat: 9.15, lng: 40.49, flag: "🇪🇹" },
  { code: "KE", name: "Kenya", lat: -0.02, lng: 37.91, flag: "🇰🇪" },
  { code: "CO", name: "Colombia", lat: 4.57, lng: -74.3, flag: "🇨🇴" },
  { code: "SE", name: "Sweden", lat: 60.13, lng: 18.64, flag: "🇸🇪" },
  { code: "NO", name: "Norway", lat: 60.47, lng: 8.47, flag: "🇳🇴" },
  { code: "IL", name: "Israel", lat: 31.05, lng: 34.85, flag: "🇮🇱" },
  { code: "CL", name: "Chile", lat: -35.68, lng: -71.54, flag: "🇨🇱" },
  { code: "PE", name: "Peru", lat: -9.19, lng: -75.02, flag: "🇵🇪" },
  { code: "GR", name: "Greece", lat: 39.07, lng: 21.82, flag: "🇬🇷" },
  { code: "NZ", name: "New Zealand", lat: -40.9, lng: 174.89, flag: "🇳🇿" },
  { code: "IR", name: "Iran", lat: 32.43, lng: 53.69, flag: "🇮🇷" },
  { code: "IQ", name: "Iraq", lat: 33.22, lng: 43.68, flag: "🇮🇶" },
];

export function getCountryByCode(code: string): CountryInfo | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function searchCountries(query: string): CountryInfo[] {
  const lower = query.toLowerCase();
  return COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(lower) ||
      c.code.toLowerCase().includes(lower)
  );
}
