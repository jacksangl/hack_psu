import type { Feature, Geometry } from "geojson";
import { COUNTRIES } from "../../../utils/countryData";

export type CountryFeature = Feature<Geometry, { name?: string } | null> & {
  id?: string | number;
};

const NUM_TO_ALPHA2: Record<string, string> = {
  "840": "US",
  "76": "BR",
  "356": "IN",
  "276": "DE",
  "156": "CN",
  "566": "NG",
  "804": "UA",
  "36": "AU",
  "826": "GB",
  "250": "FR",
  "392": "JP",
  "410": "KR",
  "124": "CA",
  "484": "MX",
  "710": "ZA",
  "682": "SA",
  "643": "RU",
  "380": "IT",
  "724": "ES",
  "792": "TR",
  "616": "PL",
  "32": "AR",
  "818": "EG",
  "764": "TH",
  "360": "ID",
  "586": "PK",
  "50": "BD",
  "608": "PH",
  "704": "VN",
  "231": "ET",
  "404": "KE",
  "170": "CO",
  "752": "SE",
  "578": "NO",
  "376": "IL",
  "152": "CL",
  "604": "PE",
  "300": "GR",
  "554": "NZ",
  "364": "IR",
  "368": "IQ",
};

const TOPO_NAME_TO_ALPHA2: Record<string, string> = {
  "bolivia plurinational state of": "BO",
  "bosnia and herzegovina": "BA",
  "brunei darussalam": "BN",
  "cabo verde": "CV",
  "central african rep": "CF",
  "congo": "CG",
  "dr congo": "CD",
  "czechia": "CZ",
  "dem rep congo": "CD",
  "democratic republic of congo": "CD",
  "democratic republic of the congo": "CD",
  "dominican rep": "DO",
  "eq guinea": "GQ",
  "eswatini": "SZ",
  "iran": "IR",
  "cote d ivoire": "CI",
  "ivory coast": "CI",
  "korea": "KR",
  "lao pdr": "LA",
  "moldova": "MD",
  "north korea": "KP",
  "republic of congo": "CG",
  "republic of the congo": "CG",
  "russian federation": "RU",
  "s sudan": "SS",
  "south sudan": "SS",
  "solomon is": "SB",
  "south korea": "KR",
  "syria": "SY",
  "timor-leste": "TL",
  "united republic of tanzania": "TZ",
  "united states of america": "US",
  "viet nam": "VN",
};

export function normalizeCountryName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const COUNTRY_CODE_BY_NAME = new Map<string, string>(
  COUNTRIES.map((country) => [normalizeCountryName(country.name), country.code])
);

export function resolveFeatureCountryCode(
  feature: Pick<CountryFeature, "id" | "properties">
) {
  const topoName = feature.properties?.name;
  if (topoName) {
    const normalized = normalizeCountryName(topoName);
    const aliasedCode = TOPO_NAME_TO_ALPHA2[normalized];
    if (aliasedCode) {
      return aliasedCode;
    }

    const exactCode = COUNTRY_CODE_BY_NAME.get(normalized);
    if (exactCode) {
      return exactCode;
    }
  }

  const numericCode = feature.id == null ? null : NUM_TO_ALPHA2[String(feature.id)];
  return numericCode ?? null;
}
