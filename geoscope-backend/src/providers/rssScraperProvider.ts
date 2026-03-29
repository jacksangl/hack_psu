import * as cheerio from "cheerio";
import { logger } from "../lib/logger";
import type { FetchCountryNewsParams, NewsProvider, ProviderNewsArticle } from "./newsProvider";

const FETCH_TIMEOUT_MS = 8_000;

/** Major international RSS feeds grouped by region/scope. */
const GLOBAL_RSS_FEEDS = [
  "https://news.google.com/rss?hl=en&gl=US&ceid=US:en",
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://www.aljazeera.com/xml/rss/all.xml",
  "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
  "https://feeds.skynews.com/feeds/rss/world.xml",
  "https://www.theguardian.com/world/rss",
];

/** Regional BBC feeds for better coverage. */
const REGIONAL_RSS_FEEDS: Record<string, string[]> = {
  africa: ["https://feeds.bbci.co.uk/news/world/africa/rss.xml"],
  asia: ["https://feeds.bbci.co.uk/news/world/asia/rss.xml"],
  europe: ["https://feeds.bbci.co.uk/news/world/europe/rss.xml"],
  "latin-america": ["https://feeds.bbci.co.uk/news/world/latin_america/rss.xml"],
  "middle-east": ["https://feeds.bbci.co.uk/news/world/middle_east/rss.xml"],
};

/** Map country codes to regions for regional feed lookups. */
const COUNTRY_REGION: Record<string, string> = {
  // Africa
  DZ: "africa", AO: "africa", BJ: "africa", BW: "africa", BF: "africa",
  BI: "africa", CV: "africa", CM: "africa", CF: "africa", TD: "africa",
  KM: "africa", CG: "africa", CD: "africa", CI: "africa", DJ: "africa",
  EG: "africa", GQ: "africa", ER: "africa", SZ: "africa", ET: "africa",
  GA: "africa", GM: "africa", GH: "africa", GN: "africa", GW: "africa",
  KE: "africa", LS: "africa", LR: "africa", LY: "africa", MG: "africa",
  MW: "africa", ML: "africa", MR: "africa", MU: "africa", MA: "africa",
  MZ: "africa", NA: "africa", NE: "africa", NG: "africa", RW: "africa",
  ST: "africa", SN: "africa", SC: "africa", SL: "africa", SO: "africa",
  ZA: "africa", SD: "africa", TZ: "africa", TG: "africa", TN: "africa",
  UG: "africa", ZM: "africa", ZW: "africa",
  // Asia
  AF: "asia", BD: "asia", BT: "asia", BN: "asia", KH: "asia",
  CN: "asia", IN: "asia", ID: "asia", JP: "asia", KZ: "asia",
  KG: "asia", LA: "asia", MY: "asia", MV: "asia", MN: "asia",
  MM: "asia", NP: "asia", KP: "asia", KR: "asia", PK: "asia",
  PH: "asia", SG: "asia", LK: "asia", TW: "asia", TJ: "asia",
  TH: "asia", TL: "asia", TM: "asia", UZ: "asia", VN: "asia",
  HK: "asia",
  // Europe
  AL: "europe", AM: "europe", AT: "europe", AZ: "europe", BY: "europe",
  BE: "europe", BA: "europe", BG: "europe", HR: "europe", CY: "europe",
  CZ: "europe", DK: "europe", EE: "europe", FI: "europe", FR: "europe",
  GE: "europe", DE: "europe", GR: "europe", HU: "europe", IS: "europe",
  IE: "europe", IT: "europe", XK: "europe", LV: "europe", LT: "europe",
  LU: "europe", MT: "europe", MD: "europe", ME: "europe", NL: "europe",
  MK: "europe", NO: "europe", PL: "europe", PT: "europe", RO: "europe",
  RU: "europe", RS: "europe", SK: "europe", SI: "europe", ES: "europe",
  SE: "europe", CH: "europe", UA: "europe", GB: "europe",
  // Latin America
  AR: "latin-america", BS: "latin-america", BB: "latin-america",
  BZ: "latin-america", BO: "latin-america", BR: "latin-america",
  CL: "latin-america", CO: "latin-america", CR: "latin-america",
  CU: "latin-america", DO: "latin-america", EC: "latin-america",
  SV: "latin-america", GT: "latin-america", GY: "latin-america",
  HT: "latin-america", HN: "latin-america", JM: "latin-america",
  MX: "latin-america", NI: "latin-america", PA: "latin-america",
  PY: "latin-america", PE: "latin-america", PR: "latin-america",
  SR: "latin-america", TT: "latin-america", UY: "latin-america",
  VE: "latin-america",
  // Middle East
  BH: "middle-east", IR: "middle-east", IQ: "middle-east", IL: "middle-east",
  JO: "middle-east", KW: "middle-east", LB: "middle-east", OM: "middle-east",
  PS: "middle-east", QA: "middle-east", SA: "middle-east", SY: "middle-east",
  TR: "middle-east", AE: "middle-east", YE: "middle-east",
};

export interface RssItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  description: string | null;
}

function parseRssItems(xml: string): RssItem[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const items: RssItem[] = [];

  $("item").each((_, el) => {
    const title = $(el).find("title").first().text().trim();
    const link = $(el).find("link").first().text().trim();
    const pubDate = $(el).find("pubDate").first().text().trim();
    const description = $(el).find("description").first().text().trim() || null;

    const sourceTag = $(el).find("source").first().text().trim();
    let source = sourceTag || "";

    if (!source && link) {
      try {
        source = new URL(link).hostname.replace("www.", "");
      } catch {
        source = "Unknown";
      }
    }

    if (title && link) {
      items.push({ title, link, source, pubDate, description });
    }
  });

  return items;
}

export async function fetchRss(url: string): Promise<RssItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "GeoScope/1.0 (news aggregator)",
        Accept: "application/rss+xml, application/xml, text/xml",
        "Accept-Encoding": "gzip, deflate",
      },
    });

    if (!response.ok) {
      logger.warn("rss fetch failed", { url, status: response.status });
      return [];
    }

    const xml = await response.text();
    return parseRssItems(xml);
  } catch (error) {
    logger.warn("rss fetch error", {
      url,
      error: error instanceof Error ? error.message : "unknown",
    });
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// ---------- Global feed cache (shared across country ingestions) ----------

let globalFeedCache: RssItem[] | null = null;
let globalFeedCacheTime = 0;
const GLOBAL_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const regionalFeedCache = new Map<string, { items: RssItem[]; time: number }>();

export async function getGlobalFeedItems(): Promise<RssItem[]> {
  if (globalFeedCache && Date.now() - globalFeedCacheTime < GLOBAL_CACHE_TTL_MS) {
    return globalFeedCache;
  }

  const results = await Promise.all(GLOBAL_RSS_FEEDS.map((url) => fetchRss(url)));
  globalFeedCache = results.flat();
  globalFeedCacheTime = Date.now();
  logger.info("global RSS cache refreshed", { articles: globalFeedCache.length });
  return globalFeedCache;
}

async function getRegionalFeedItems(region: string): Promise<RssItem[]> {
  const cached = regionalFeedCache.get(region);
  if (cached && Date.now() - cached.time < GLOBAL_CACHE_TTL_MS) {
    return cached.items;
  }

  const urls = REGIONAL_RSS_FEEDS[region];
  if (!urls) return [];

  const results = await Promise.all(urls.map((url) => fetchRss(url)));
  const items = results.flat();
  regionalFeedCache.set(region, { items, time: Date.now() });
  return items;
}

// ---------- Country matching ----------

/** Check if an article title/description mentions a country. */
function mentionsCountry(item: RssItem, countryName: string): boolean {
  const haystack = `${item.title} ${item.description ?? ""}`.toLowerCase();
  const name = countryName.toLowerCase();

  if (haystack.includes(name)) return true;

  const aliases = COUNTRY_ALIASES[name];
  if (aliases) {
    return aliases.some((alias) => haystack.includes(alias));
  }

  return false;
}

const COUNTRY_ALIASES: Record<string, string[]> = {
  "united states": ["u.s.", " us ", "usa", "american", "washington"],
  "united kingdom": [" uk ", "u.k.", "britain", "british", "london"],
  "russian federation": ["russia", "russian", "moscow", "kremlin"],
  "korea, republic of": ["south korea", "korean", "seoul"],
  "korea, democratic people's republic of": ["north korea", "pyongyang"],
  "iran, islamic republic of": ["iran", "iranian", "tehran"],
  "china": ["chinese", "beijing", "shanghai"],
  "india": ["indian", "delhi", "mumbai"],
  "japan": ["japanese", "tokyo"],
  "germany": ["german", "berlin"],
  "france": ["french", "paris", "macron"],
  "brazil": ["brazilian", "brasilia"],
  "australia": ["australian", "sydney", "canberra"],
  "canada": ["canadian", "ottawa", "toronto"],
  "israel": ["israeli", "tel aviv", "jerusalem"],
  "ukraine": ["ukrainian", "kyiv", "zelensky"],
  "saudi arabia": ["saudi", "riyadh"],
  "south africa": ["south african", "pretoria", "johannesburg"],
  "new zealand": ["new zealand", "wellington", "auckland"],
  "mexico": ["mexican", "mexico city"],
  "turkey": ["turkish", "turkiye", "ankara", "istanbul"],
  "egypt": ["egyptian", "cairo"],
  "nigeria": ["nigerian", "lagos", "abuja"],
  "pakistan": ["pakistani", "islamabad", "karachi"],
  "indonesia": ["indonesian", "jakarta"],
  "philippines": ["filipino", "philippine", "manila"],
  "thailand": ["thai", "bangkok"],
  "vietnam": ["vietnamese", "hanoi"],
  "colombia": ["colombian", "bogota"],
  "argentina": ["argentine", "buenos aires"],
  "poland": ["polish", "warsaw"],
  "netherlands": ["dutch", "amsterdam", "the hague"],
  "taiwan": ["taiwanese", "taipei"],
  "switzerland": ["swiss", "zurich", "geneva"],
  "sweden": ["swedish", "stockholm"],
  "norway": ["norwegian", "oslo"],
  "denmark": ["danish", "copenhagen"],
  "finland": ["finnish", "helsinki"],
  "greece": ["greek", "athens"],
  "portugal": ["portuguese", "lisbon"],
  "spain": ["spanish", "madrid", "barcelona"],
  "italy": ["italian", "rome", "milan"],
  "iraq": ["iraqi", "baghdad"],
  "syria": ["syrian", "damascus"],
  "lebanon": ["lebanese", "beirut"],
  "jordan": ["jordanian", "amman"],
  "yemen": ["yemeni", "sanaa"],
  "somalia": ["somali", "mogadishu"],
  "ethiopia": ["ethiopian", "addis ababa"],
  "kenya": ["kenyan", "nairobi"],
  "south sudan": ["south sudanese", "juba"],
  "sudan": ["sudanese", "khartoum"],
  "libya": ["libyan", "tripoli"],
  "tunisia": ["tunisian", "tunis"],
  "algeria": ["algerian", "algiers"],
  "morocco": ["moroccan", "rabat", "casablanca"],
  "ghana": ["ghanaian", "accra"],
  "senegal": ["senegalese", "dakar"],
  "dr congo": ["congolese", "kinshasa"],
  "tanzania": ["tanzanian", "dar es salaam"],
  "myanmar": ["burmese", "myanmar", "yangon"],
  "bangladesh": ["bangladeshi", "dhaka"],
  "sri lanka": ["sri lankan", "colombo"],
  "nepal": ["nepalese", "nepali", "kathmandu"],
  "afghanistan": ["afghan", "kabul", "taliban"],
  "cuba": ["cuban", "havana"],
  "venezuela": ["venezuelan", "caracas"],
  "peru": ["peruvian", "lima"],
  "chile": ["chilean", "santiago"],
  "ecuador": ["ecuadorian", "quito"],
  "bolivia": ["bolivian", "la paz"],
  "paraguay": ["paraguayan", "asuncion"],
  "uruguay": ["uruguayan", "montevideo"],
  "united arab emirates": ["uae", "dubai", "abu dhabi", "emirati"],
  "qatar": ["qatari", "doha"],
  "kuwait": ["kuwaiti"],
  "bahrain": ["bahraini", "manama"],
  "oman": ["omani", "muscat"],
  "kazakhstan": ["kazakh", "astana", "almaty"],
  "uzbekistan": ["uzbek", "tashkent"],
  "romania": ["romanian", "bucharest"],
  "hungary": ["hungarian", "budapest"],
  "czech republic": ["czech", "prague"],
  "czechia": ["czech", "prague"],
  "slovakia": ["slovak", "bratislava"],
  "croatia": ["croatian", "zagreb"],
  "serbia": ["serbian", "belgrade"],
  "bulgaria": ["bulgarian", "sofia"],
  "slovenia": ["slovenian", "ljubljana"],
  "estonia": ["estonian", "tallinn"],
  "latvia": ["latvian", "riga"],
  "lithuania": ["lithuanian", "vilnius"],
  "belarus": ["belarusian", "minsk"],
  "moldova": ["moldovan", "chisinau"],
  "georgia": ["georgian", "tbilisi"],
  "armenia": ["armenian", "yerevan"],
  "azerbaijan": ["azerbaijani", "baku"],
  "cyprus": ["cypriot", "nicosia"],
  "iceland": ["icelandic", "reykjavik"],
  "ireland": ["irish", "dublin"],
  "luxembourg": ["luxembourgish"],
  "mongolia": ["mongolian", "ulaanbaatar"],
  "cameroon": ["cameroonian", "yaounde"],
  "ivory coast": ["ivorian", "abidjan"],
  "cote d'ivoire": ["ivorian", "abidjan"],
  "mozambique": ["mozambican", "maputo"],
  "zimbabwe": ["zimbabwean", "harare"],
  "zambia": ["zambian", "lusaka"],
  "uganda": ["ugandan", "kampala"],
  "rwanda": ["rwandan", "kigali"],
  "madagascar": ["malagasy", "antananarivo"],
  "angola": ["angolan", "luanda"],
  "malaysia": ["malaysian", "kuala lumpur"],
  "singapore": ["singaporean"],
  "cambodia": ["cambodian", "phnom penh"],
  "papua new guinea": ["papuan", "port moresby"],
};

// ---------- Provider ----------

export class RssScraperProvider implements NewsProvider {
  public readonly name = "rss-scraper";

  async fetchCountryNews(params: FetchCountryNewsParams): Promise<ProviderNewsArticle[]> {
    const articles: RssItem[] = [];
    const seenUrls = new Set<string>();

    const addItems = (items: RssItem[]) => {
      for (const item of items) {
        if (!seenUrls.has(item.link) && articles.length < params.limit) {
          seenUrls.add(item.link);
          articles.push(item);
        }
      }
    };

    // Strategies 1+2: Fire both Google News searches in parallel
    const googleUrl1 = `https://news.google.com/rss/search?q=${encodeURIComponent(params.countryName + " news")}&hl=en&gl=US&ceid=US:en`;
    const googleUrl2 = `https://news.google.com/rss/search?q=${encodeURIComponent(params.countryName)}&hl=en&gl=US&ceid=US:en`;

    // Also pre-fetch regional + global feeds in parallel (they're cached so this is cheap on repeat calls)
    const region = COUNTRY_REGION[params.countryCode];
    const [googleItems1, googleItems2, regionalItems, globalItems] = await Promise.all([
      fetchRss(googleUrl1),
      googleUrl2 !== googleUrl1 ? fetchRss(googleUrl2) : Promise.resolve([] as RssItem[]),
      region ? getRegionalFeedItems(region) : Promise.resolve([] as RssItem[]),
      getGlobalFeedItems(),
    ]);

    // Add results in priority order (most targeted first)
    addItems(googleItems1);

    if (articles.length < params.limit) {
      addItems(googleItems2);
    }

    // Strategy 3: Regional BBC feed — filter for country mentions
    if (articles.length < params.limit) {
      const matched = regionalItems.filter((item) => mentionsCountry(item, params.countryName));
      addItems(matched);
    }

    // Strategy 4: Global feeds (cached) — filter for country mentions
    if (articles.length < params.limit) {
      const matched = globalItems.filter((item) => mentionsCountry(item, params.countryName));
      addItems(matched);
    }

    return articles.map((item) => ({
      rawId: item.link,
      title: cleanHtml(item.title),
      source: item.source || "Unknown",
      url: item.link,
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      description: item.description ? cleanHtml(item.description) : null,
      imageUrl: null,
      locationName: params.countryName,
      toneScore: null,
    }));
  }
}

/** Strip HTML tags from text (RSS descriptions sometimes contain markup). */
export function cleanHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}
