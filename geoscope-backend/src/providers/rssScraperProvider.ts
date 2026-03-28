import * as cheerio from "cheerio";
import { logger } from "../lib/logger";
import type { FetchCountryNewsParams, NewsProvider, ProviderNewsArticle } from "./newsProvider";

const FETCH_TIMEOUT_MS = 12_000;

/** Major international RSS feeds grouped by region/scope. */
const GLOBAL_RSS_FEEDS = [
  "https://news.google.com/rss?hl=en&gl=US&ceid=US:en",                     // Google News top
  "https://feeds.bbci.co.uk/news/world/rss.xml",                             // BBC World
  "https://www.aljazeera.com/xml/rss/all.xml",                               // Al Jazeera
  "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",                  // NYT World
  "https://feeds.skynews.com/feeds/rss/world.xml",                           // Sky News World
  "https://www.theguardian.com/world/rss",                                   // Guardian World
];

/** Build a Google News RSS search URL for a specific country. */
const googleNewsSearchUrl = (countryName: string): string =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(countryName)}&hl=en&gl=US&ceid=US:en`;

interface RssItem {
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

    // Google News uses <source> tag; others we extract from the domain
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

async function fetchRss(url: string): Promise<RssItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "GeoScope/1.0 (news aggregator)",
        Accept: "application/rss+xml, application/xml, text/xml",
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

/** Check if an article title/description mentions a country. */
function mentionsCountry(item: RssItem, countryName: string): boolean {
  const haystack = `${item.title} ${item.description ?? ""}`.toLowerCase();
  const name = countryName.toLowerCase();

  // Direct match
  if (haystack.includes(name)) return true;

  // Handle common short names
  const shortNames: Record<string, string[]> = {
    "united states": ["u.s.", "us ", "usa", "american"],
    "united kingdom": ["uk ", "u.k.", "britain", "british"],
    "russian federation": ["russia", "russian"],
    "korea, republic of": ["south korea", "korean"],
    "korea, democratic people's republic of": ["north korea"],
    "iran, islamic republic of": ["iran", "iranian"],
    "china": ["chinese", "beijing"],
    "india": ["indian", "delhi", "mumbai"],
    "japan": ["japanese", "tokyo"],
    "germany": ["german", "berlin"],
    "france": ["french", "paris"],
    "brazil": ["brazilian"],
    "australia": ["australian"],
    "canada": ["canadian"],
    "israel": ["israeli"],
    "ukraine": ["ukrainian", "kyiv"],
    "saudi arabia": ["saudi"],
    "south africa": ["south african"],
    "new zealand": ["new zealand"],
    "mexico": ["mexican"],
    "turkey": ["turkish", "ankara"],
    "egypt": ["egyptian", "cairo"],
    "nigeria": ["nigerian"],
    "pakistan": ["pakistani"],
    "indonesia": ["indonesian"],
    "philippines": ["filipino", "philippine"],
    "thailand": ["thai", "bangkok"],
    "vietnam": ["vietnamese"],
    "colombia": ["colombian"],
    "argentina": ["argentine"],
    "poland": ["polish"],
    "netherlands": ["dutch"],
    "taiwan": ["taiwanese", "taipei"],
    "switzerland": ["swiss"],
    "sweden": ["swedish"],
    "norway": ["norwegian"],
    "denmark": ["danish"],
    "finland": ["finnish"],
    "greece": ["greek"],
    "portugal": ["portuguese"],
    "spain": ["spanish"],
    "italy": ["italian"],
  };

  const aliases = shortNames[name];
  if (aliases) {
    return aliases.some((alias) => haystack.includes(alias));
  }

  return false;
}

export class RssScraperProvider implements NewsProvider {
  public readonly name = "rss-scraper";

  async fetchCountryNews(params: FetchCountryNewsParams): Promise<ProviderNewsArticle[]> {
    // Strategy 1: Google News search for this specific country (most targeted)
    const googleUrl = googleNewsSearchUrl(params.countryName);
    const googleItems = await fetchRss(googleUrl);

    // If Google News gave us enough results, use those directly
    let articles = googleItems.slice(0, params.limit);

    // Strategy 2: If we didn't get enough, also scan global feeds for mentions
    if (articles.length < params.limit) {
      const globalResults = await Promise.all(
        GLOBAL_RSS_FEEDS.map((url) => fetchRss(url))
      );

      const globalItems = globalResults
        .flat()
        .filter((item) => mentionsCountry(item, params.countryName));

      // Dedupe by link
      const seenUrls = new Set(articles.map((a) => a.link));
      for (const item of globalItems) {
        if (!seenUrls.has(item.link) && articles.length < params.limit) {
          seenUrls.add(item.link);
          articles.push(item);
        }
      }
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
function cleanHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}
