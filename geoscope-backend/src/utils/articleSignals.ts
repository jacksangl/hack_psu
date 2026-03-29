import { getCountryName, getSupportedCountryCodes, normalizeCountryCode } from "./countryCodeMap";

const topicMatchers: Array<{ topic: string; pattern: RegExp }> = [
  { topic: "Politics", pattern: /\b(election|government|minister|parliament|president|policy|congress|legislation|vote|senate|republican|democrat|law|reform|governor|mayor|caucus|primary|ballot)\b/i },
  { topic: "Conflict", pattern: /\b(attack|conflict|war|military|strike|violence|missile|bomb|troops|invasion|siege|casualt|airstrike|drone|weapon|combat|insurgent|rebel|terror)\b/i },
  { topic: "Economy", pattern: /\b(economy|inflation|market|trade|budget|growth|gdp|recession|unemployment|stocks|federal reserve|interest rate|debt|tariff|export|import|fiscal|monetary)\b/i },
  { topic: "Business", pattern: /\b(company|business|industry|investment|merger|startup|ceo|profit|revenue|earnings|acquisition|ipo|shareholder|corporate|bankruptcy)\b/i },
  { topic: "Climate", pattern: /\b(climate|weather|storm|flood|wildfire|drought|emissions|carbon|renewable|hurricane|tornado|earthquake|tsunami|pollution|warming)\b/i },
  { topic: "Health", pattern: /\b(health|hospital|disease|virus|outbreak|medicine|vaccine|pandemic|surgeon|patient|cancer|treatment|pharmaceutical|fda|who)\b/i },
  { topic: "Technology", pattern: /\b(technology|artificial intelligence|software|cyber|data|chip|robot|quantum|blockchain|tesla|apple|google|microsoft|openai|startup|semiconductor|internet|crypto)\b/i },
  { topic: "Sports", pattern: /\b(sport|football|soccer|basketball|cricket|tournament|nba|nfl|uefa|olympics|match|championship|league|player|coach|mvp|score|medal|world cup|tennis|formula)\b/i },
  { topic: "Culture", pattern: /\b(culture|festival|film|music|art|museum|movie|concert|theater|book|novel|award|grammy|oscar|emmy|celebrity)\b/i },
  { topic: "Diplomacy", pattern: /\b(diplomacy|summit|treaty|embassy|sanction|ceasefire|bilateral|multilateral|nato|united nations|g7|g20|alliance|negotiation|accord)\b/i },
];

const COUNTRY_ALIASES: Record<string, string[]> = {
  US: ["united states", "united states of america", "u.s.", "u.s.a.", "usa", "american", "washington"],
  GB: ["united kingdom", "uk", "u.k.", "britain", "british", "london"],
  RU: ["russia", "russian", "moscow", "kremlin"],
  KR: ["south korea", "korean", "seoul"],
  KP: ["north korea", "pyongyang"],
  IR: ["iran", "iranian", "tehran"],
  CN: ["china", "chinese", "beijing", "shanghai"],
  IN: ["india", "indian", "delhi", "mumbai"],
  JP: ["japan", "japanese", "tokyo"],
  DE: ["germany", "german", "berlin"],
  FR: ["france", "french", "paris", "macron"],
  BR: ["brazil", "brazilian", "brasilia"],
  CA: ["canada", "canadian", "ottawa", "toronto"],
  AU: ["australia", "australian", "sydney", "canberra"],
  IL: ["israel", "israeli", "tel aviv", "jerusalem"],
  UA: ["ukraine", "ukrainian", "kyiv", "zelensky"],
  SA: ["saudi arabia", "saudi", "riyadh"],
  ZA: ["south africa", "south african", "pretoria", "johannesburg"],
  MX: ["mexico", "mexican", "mexico city"],
  TR: ["turkey", "turkish", "turkiye", "ankara", "istanbul"],
  EG: ["egypt", "egyptian", "cairo"],
  NG: ["nigeria", "nigerian", "lagos", "abuja"],
  PK: ["pakistan", "pakistani", "islamabad", "karachi"],
  ID: ["indonesia", "indonesian", "jakarta"],
  PH: ["philippines", "filipino", "philippine", "manila"],
  TH: ["thailand", "thai", "bangkok"],
  VN: ["vietnam", "vietnamese", "hanoi"],
  AR: ["argentina", "argentine", "buenos aires"],
  CO: ["colombia", "colombian", "bogota"],
  PL: ["poland", "polish", "warsaw"],
  NL: ["netherlands", "dutch", "amsterdam", "the hague"],
  TW: ["taiwan", "taiwanese", "taipei"],
  CH: ["switzerland", "swiss", "zurich", "geneva"],
  AE: ["united arab emirates", "uae", "abu dhabi", "dubai"],
};

const normalizePhrase = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildHaystack = (title: string, description?: string | null): string =>
  ` ${normalizePhrase([title, description ?? ""].join(" "))} `;

const relatedCountryMatchers = getSupportedCountryCodes().flatMap((countryCode) => {
  const countryName = getCountryName(countryCode);
  const phrases = new Set<string>();

  if (countryName) {
    phrases.add(normalizePhrase(countryName));
  }

  for (const alias of COUNTRY_ALIASES[countryCode] ?? []) {
    phrases.add(normalizePhrase(alias));
  }

  const normalizedPhrases = Array.from(phrases).filter(Boolean);

  if (normalizedPhrases.length === 0) {
    return [];
  }

  return [{ countryCode, phrases: normalizedPhrases }];
});

export const extractTopicsFromContent = (params: {
  title: string;
  description?: string | null;
  explicitTopics?: string[];
  requestedTopic?: string;
}): string[] => {
  const topics = new Set<string>();

  if (params.requestedTopic?.trim()) {
    topics.add(params.requestedTopic.trim());
  }

  for (const topic of params.explicitTopics ?? []) {
    if (topic.trim()) {
      topics.add(topic.trim());
    }
  }

  const haystack = [params.title, params.description].filter(Boolean).join(" ");

  for (const matcher of topicMatchers) {
    if (matcher.pattern.test(haystack)) {
      topics.add(matcher.topic);
    }
  }

  return Array.from(topics).slice(0, 5);
};

export const extractRelatedCountries = (params: {
  countryCode: string;
  title: string;
  description?: string | null;
}): string[] => {
  const sourceCountryCode = normalizeCountryCode(params.countryCode);
  const haystack = buildHaystack(params.title, params.description);
  const matches: string[] = [];

  for (const matcher of relatedCountryMatchers) {
    if (matcher.countryCode === sourceCountryCode) {
      continue;
    }

    if (matcher.phrases.some((phrase) => haystack.includes(` ${phrase} `))) {
      matches.push(matcher.countryCode);
    }
  }

  return matches.slice(0, 8);
};
