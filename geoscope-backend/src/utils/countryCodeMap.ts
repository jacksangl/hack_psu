import countries from "i18n-iso-countries";
import englishLocale from "i18n-iso-countries/langs/en.json";

countries.registerLocale(englishLocale);

interface CountryCentroid {
  latitude: number;
  longitude: number;
  locationName: string;
}

const centroidMap: Record<string, CountryCentroid> = {
  AU: { latitude: -25.2744, longitude: 133.7751, locationName: "Australia" },
  BR: { latitude: -14.235, longitude: -51.9253, locationName: "Brazil" },
  CA: { latitude: 56.1304, longitude: -106.3468, locationName: "Canada" },
  DE: { latitude: 51.1657, longitude: 10.4515, locationName: "Germany" },
  FR: { latitude: 46.2276, longitude: 2.2137, locationName: "France" },
  GB: { latitude: 55.3781, longitude: -3.436, locationName: "United Kingdom" },
  IN: { latitude: 20.5937, longitude: 78.9629, locationName: "India" },
  JP: { latitude: 36.2048, longitude: 138.2529, locationName: "Japan" },
  NG: { latitude: 9.082, longitude: 8.6753, locationName: "Nigeria" },
  UA: { latitude: 48.3794, longitude: 31.1656, locationName: "Ukraine" },
  US: { latitude: 37.0902, longitude: -95.7129, locationName: "United States" },
  ZA: { latitude: -30.5595, longitude: 22.9375, locationName: "South Africa" },
};

export const normalizeCountryCode = (countryCode: string): string => countryCode.trim().toUpperCase();

export const getCountryName = (countryCode: string): string | null =>
  countries.getName(normalizeCountryCode(countryCode), "en") ?? null;

export const getCountryCentroid = (countryCode: string): CountryCentroid | null =>
  centroidMap[normalizeCountryCode(countryCode)] ?? null;
