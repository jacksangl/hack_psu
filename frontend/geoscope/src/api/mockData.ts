import type { Sentiment } from "../utils/sentimentColors";

export type NewsCategory = "politics" | "conflict" | "economy" | "business" | "climate" | "health" | "technology" | "sports" | "culture" | "diplomacy";

export interface Article {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  lat: number;
  lng: number;
  sentiment: Sentiment;
  relatedCountries: string[];
  category: NewsCategory;
}

export interface NewsResponse {
  countryCode: string;
  countryName: string;
  articles: Article[];
}

export interface BriefResponse {
  countryCode: string;
  summary: string;
  sentiment: Sentiment;
  sentimentScore: number;
  keyActors: string[];
  topicTags: string[];
  articleCount: number;
  lastUpdated: string;
}

export interface SentimentEntry {
  countryCode: string;
  sentiment: Sentiment;
  sentimentScore: number;
}

export interface SentimentResponse {
  countries: SentimentEntry[];
  generatedAt: string;
}

const NEWS_DATA: Record<string, NewsResponse> = {
  US: {
    countryCode: "US",
    countryName: "United States",
    articles: [
      {
        id: "us-1",
        title: "Federal Reserve Signals Potential Rate Cut Amid Cooling Inflation",
        source: "Reuters",
        publishedAt: "2026-03-28T08:30:00Z",
        url: "https://example.com/us-fed-rate",
        lat: 38.89,
        lng: -77.04,
        sentiment: "positive",
        relatedCountries: ["GB", "DE", "JP"],
        category: "economy",
      },
      {
        id: "us-2",
        title: "Severe Storms Batter Gulf Coast, Millions Without Power",
        source: "AP News",
        publishedAt: "2026-03-27T14:15:00Z",
        url: "https://example.com/us-storms",
        lat: 29.76,
        lng: -95.37,
        sentiment: "crisis",
        relatedCountries: [],
        category: "climate",
      },
      {
        id: "us-3",
        title: "Tech Giants Report Record Q1 Earnings Driven by AI Demand",
        source: "Bloomberg",
        publishedAt: "2026-03-27T11:00:00Z",
        url: "https://example.com/us-tech-earnings",
        lat: 37.39,
        lng: -122.08,
        sentiment: "positive",
        relatedCountries: ["CN", "KR", "IN"],
        category: "technology",
      },
      {
        id: "us-4",
        title: "Immigration Bill Faces Tough Senate Vote This Week",
        source: "Washington Post",
        publishedAt: "2026-03-26T19:00:00Z",
        url: "https://example.com/us-immigration",
        lat: 38.91,
        lng: -77.01,
        sentiment: "neutral",
        relatedCountries: ["MX"],
        category: "politics",
      },
    ],
  },
  BR: {
    countryCode: "BR",
    countryName: "Brazil",
    articles: [
      {
        id: "br-1",
        title: "Amazon Deforestation Drops 40% Under New Enforcement Policy",
        source: "Reuters",
        publishedAt: "2026-03-28T06:00:00Z",
        url: "https://example.com/br-amazon",
        lat: -3.12,
        lng: -60.02,
        sentiment: "positive",
        relatedCountries: ["DE", "NO"],
        category: "climate",
      },
      {
        id: "br-2",
        title: "Lula Announces Major Infrastructure Package for Northeast",
        source: "Folha de São Paulo",
        publishedAt: "2026-03-27T10:00:00Z",
        url: "https://example.com/br-infrastructure",
        lat: -8.05,
        lng: -34.87,
        sentiment: "positive",
        relatedCountries: ["CN"],
        category: "politics",
      },
      {
        id: "br-3",
        title: "Real Weakens Against Dollar as Trade Deficit Widens",
        source: "Bloomberg",
        publishedAt: "2026-03-26T15:30:00Z",
        url: "https://example.com/br-real",
        lat: -23.55,
        lng: -46.63,
        sentiment: "negative",
        relatedCountries: ["US", "AR"],
        category: "economy",
      },
      {
        id: "br-4",
        title: "Drought in Southern Brazil Threatens Soybean Harvest",
        source: "AP News",
        publishedAt: "2026-03-25T09:00:00Z",
        url: "https://example.com/br-drought",
        lat: -29.17,
        lng: -51.18,
        sentiment: "negative",
        relatedCountries: ["CN", "US"],
        category: "climate",
      },
    ],
  },
  IN: {
    countryCode: "IN",
    countryName: "India",
    articles: [
      {
        id: "in-1",
        title: "India's GDP Growth Exceeds 7% for Third Consecutive Quarter",
        source: "Economic Times",
        publishedAt: "2026-03-28T04:30:00Z",
        url: "https://example.com/in-gdp",
        lat: 28.61,
        lng: 77.21,
        sentiment: "positive",
        relatedCountries: ["US", "JP"],
        category: "economy",
      },
      {
        id: "in-2",
        title: "Chandrayaan-4 Mission Enters Final Assembly Phase",
        source: "NDTV",
        publishedAt: "2026-03-27T07:00:00Z",
        url: "https://example.com/in-space",
        lat: 13.07,
        lng: 80.23,
        sentiment: "positive",
        relatedCountries: [],
        category: "technology",
      },
      {
        id: "in-3",
        title: "Heatwave Warning Issued for Rajasthan and Gujarat",
        source: "Hindustan Times",
        publishedAt: "2026-03-27T03:00:00Z",
        url: "https://example.com/in-heatwave",
        lat: 26.91,
        lng: 70.91,
        sentiment: "negative",
        relatedCountries: [],
        category: "climate",
      },
      {
        id: "in-4",
        title: "India-EU Free Trade Agreement Negotiations Enter Final Round",
        source: "Reuters",
        publishedAt: "2026-03-26T12:00:00Z",
        url: "https://example.com/in-eu-trade",
        lat: 28.64,
        lng: 77.09,
        sentiment: "positive",
        relatedCountries: ["DE", "FR", "IT"],
        category: "politics",
      },
    ],
  },
  DE: {
    countryCode: "DE",
    countryName: "Germany",
    articles: [
      {
        id: "de-1",
        title: "German Manufacturing Rebounds After 18-Month Slump",
        source: "Der Spiegel",
        publishedAt: "2026-03-28T07:00:00Z",
        url: "https://example.com/de-manufacturing",
        lat: 50.11,
        lng: 8.68,
        sentiment: "positive",
        relatedCountries: ["CN", "US"],
        category: "economy",
      },
      {
        id: "de-2",
        title: "Coalition Tensions Rise Over Defense Spending Increase",
        source: "Deutsche Welle",
        publishedAt: "2026-03-27T13:00:00Z",
        url: "https://example.com/de-defense",
        lat: 52.52,
        lng: 13.41,
        sentiment: "negative",
        relatedCountries: ["UA", "PL"],
        category: "politics",
      },
      {
        id: "de-3",
        title: "Volkswagen Unveils Affordable EV Lineup for European Market",
        source: "Reuters",
        publishedAt: "2026-03-26T08:30:00Z",
        url: "https://example.com/de-vw-ev",
        lat: 52.42,
        lng: 10.79,
        sentiment: "positive",
        relatedCountries: ["FR", "ES"],
        category: "technology",
      },
    ],
  },
  CN: {
    countryCode: "CN",
    countryName: "China",
    articles: [
      {
        id: "cn-1",
        title: "China Launches New Stimulus Package to Boost Consumer Spending",
        source: "South China Morning Post",
        publishedAt: "2026-03-28T02:00:00Z",
        url: "https://example.com/cn-stimulus",
        lat: 39.91,
        lng: 116.4,
        sentiment: "neutral",
        relatedCountries: ["US", "JP"],
        category: "economy",
      },
      {
        id: "cn-2",
        title: "Tensions Escalate in South China Sea After Naval Confrontation",
        source: "Reuters",
        publishedAt: "2026-03-27T09:00:00Z",
        url: "https://example.com/cn-scs",
        lat: 16.0,
        lng: 112.0,
        sentiment: "crisis",
        relatedCountries: ["PH", "US"],
        category: "politics",
      },
      {
        id: "cn-3",
        title: "BYD Surpasses Tesla in Global EV Sales for Fifth Month",
        source: "Bloomberg",
        publishedAt: "2026-03-26T05:00:00Z",
        url: "https://example.com/cn-byd",
        lat: 22.54,
        lng: 114.06,
        sentiment: "positive",
        relatedCountries: ["US", "DE"],
        category: "technology",
      },
      {
        id: "cn-4",
        title: "Flooding in Guangdong Province Displaces 200,000 Residents",
        source: "Xinhua",
        publishedAt: "2026-03-25T11:00:00Z",
        url: "https://example.com/cn-flooding",
        lat: 23.13,
        lng: 113.26,
        sentiment: "crisis",
        relatedCountries: [],
        category: "climate",
      },
    ],
  },
  NG: {
    countryCode: "NG",
    countryName: "Nigeria",
    articles: [
      {
        id: "ng-1",
        title: "Nigeria's Fintech Sector Attracts $2B in Foreign Investment",
        source: "TechCabal",
        publishedAt: "2026-03-28T05:30:00Z",
        url: "https://example.com/ng-fintech",
        lat: 6.52,
        lng: 3.38,
        sentiment: "positive",
        relatedCountries: ["US", "GB"],
        category: "technology",
      },
      {
        id: "ng-2",
        title: "Naira Stabilizes After Central Bank Intervention",
        source: "Reuters",
        publishedAt: "2026-03-27T08:00:00Z",
        url: "https://example.com/ng-naira",
        lat: 9.06,
        lng: 7.49,
        sentiment: "neutral",
        relatedCountries: [],
        category: "economy",
      },
      {
        id: "ng-3",
        title: "Security Forces Clash With Militants in Northern Borno State",
        source: "Al Jazeera",
        publishedAt: "2026-03-26T16:00:00Z",
        url: "https://example.com/ng-borno",
        lat: 11.85,
        lng: 13.16,
        sentiment: "crisis",
        relatedCountries: ["TD"],
        category: "politics",
      },
      {
        id: "ng-4",
        title: "Lagos Begins Construction of Fourth Mainland Bridge",
        source: "Punch Nigeria",
        publishedAt: "2026-03-25T07:00:00Z",
        url: "https://example.com/ng-bridge",
        lat: 6.45,
        lng: 3.41,
        sentiment: "positive",
        relatedCountries: ["CN"],
        category: "economy",
      },
    ],
  },
  UA: {
    countryCode: "UA",
    countryName: "Ukraine",
    articles: [
      {
        id: "ua-1",
        title: "Ceasefire Talks Resume in Geneva With New Framework Proposal",
        source: "Reuters",
        publishedAt: "2026-03-28T10:00:00Z",
        url: "https://example.com/ua-ceasefire",
        lat: 50.45,
        lng: 30.52,
        sentiment: "neutral",
        relatedCountries: ["RU", "US", "DE", "FR"],
        category: "politics",
      },
      {
        id: "ua-2",
        title: "Ukraine Receives New Air Defense Systems From NATO Allies",
        source: "BBC",
        publishedAt: "2026-03-27T15:00:00Z",
        url: "https://example.com/ua-defense",
        lat: 50.44,
        lng: 30.52,
        sentiment: "positive",
        relatedCountries: ["US", "DE", "PL"],
        category: "politics",
      },
      {
        id: "ua-3",
        title: "Civilian Casualties Rise as Shelling Intensifies in Kharkiv",
        source: "AP News",
        publishedAt: "2026-03-26T12:30:00Z",
        url: "https://example.com/ua-kharkiv",
        lat: 49.99,
        lng: 36.23,
        sentiment: "crisis",
        relatedCountries: ["RU"],
        category: "conflict",
      },
      {
        id: "ua-4",
        title: "Ukrainian Tech Workers Drive Remote Economy Boom",
        source: "Wired",
        publishedAt: "2026-03-25T08:00:00Z",
        url: "https://example.com/ua-tech",
        lat: 50.43,
        lng: 30.52,
        sentiment: "positive",
        relatedCountries: ["PL", "DE"],
        category: "technology",
      },
      {
        id: "ua-5",
        title: "Power Grid Repairs Restore Electricity to Odesa Region",
        source: "Ukrinform",
        publishedAt: "2026-03-24T14:00:00Z",
        url: "https://example.com/ua-power",
        lat: 46.47,
        lng: 30.73,
        sentiment: "positive",
        relatedCountries: [],
        category: "conflict",
      },
    ],
  },
  AU: {
    countryCode: "AU",
    countryName: "Australia",
    articles: [
      {
        id: "au-1",
        title: "Australia Signs Landmark Critical Minerals Deal With Japan",
        source: "ABC News",
        publishedAt: "2026-03-28T01:00:00Z",
        url: "https://example.com/au-minerals",
        lat: -35.28,
        lng: 149.13,
        sentiment: "positive",
        relatedCountries: ["JP", "US"],
        category: "economy",
      },
      {
        id: "au-2",
        title: "Great Barrier Reef Experiences Worst Bleaching Event on Record",
        source: "Guardian",
        publishedAt: "2026-03-27T04:00:00Z",
        url: "https://example.com/au-reef",
        lat: -18.29,
        lng: 147.7,
        sentiment: "crisis",
        relatedCountries: [],
        category: "climate",
      },
      {
        id: "au-3",
        title: "Housing Market Cools as Interest Rates Hold Steady",
        source: "Sydney Morning Herald",
        publishedAt: "2026-03-26T22:00:00Z",
        url: "https://example.com/au-housing",
        lat: -33.87,
        lng: 151.21,
        sentiment: "neutral",
        relatedCountries: [],
        category: "economy",
      },
    ],
  },
};

const BRIEF_DATA: Record<string, BriefResponse> = {
  US: {
    countryCode: "US",
    summary:
      "The United States is experiencing a mixed week with positive economic signals from the Fed's potential rate cut and strong tech earnings, offset by severe weather events along the Gulf Coast. Immigration policy continues to dominate the political landscape.",
    sentiment: "neutral",
    sentimentScore: 0.15,
    keyActors: ["Federal Reserve", "Congress", "Big Tech CEOs"],
    topicTags: ["economy", "weather", "technology", "immigration"],
    articleCount: 4,
    lastUpdated: "2026-03-28T09:00:00Z",
  },
  BR: {
    countryCode: "BR",
    summary:
      "Brazil sees encouraging environmental progress with a 40% drop in Amazon deforestation and new infrastructure investment in the Northeast. However, the weakening Real and drought conditions in the south present economic headwinds.",
    sentiment: "positive",
    sentimentScore: 0.3,
    keyActors: ["Lula", "Central Bank", "Ibama"],
    topicTags: ["environment", "economy", "infrastructure", "agriculture"],
    articleCount: 4,
    lastUpdated: "2026-03-28T09:00:00Z",
  },
  IN: {
    countryCode: "IN",
    summary:
      "India continues its strong economic trajectory with GDP growth exceeding 7% and advancing space ambitions with Chandrayaan-4. Trade negotiations with the EU are in final stages, though extreme heat events pose growing climate concerns.",
    sentiment: "positive",
    sentimentScore: 0.55,
    keyActors: ["Modi", "ISRO", "RBI", "EU Commission"],
    topicTags: ["economy", "space", "trade", "climate"],
    articleCount: 4,
    lastUpdated: "2026-03-28T09:00:00Z",
  },
  DE: {
    countryCode: "DE",
    summary:
      "Germany's manufacturing sector shows signs of recovery after an 18-month slump. Political tensions persist within the coalition over defense spending, while the auto industry pivots aggressively toward affordable EVs.",
    sentiment: "neutral",
    sentimentScore: 0.1,
    keyActors: ["Scholz", "Volkswagen", "Bundeswehr"],
    topicTags: ["manufacturing", "defense", "automotive", "politics"],
    articleCount: 3,
    lastUpdated: "2026-03-28T09:00:00Z",
  },
  CN: {
    countryCode: "CN",
    summary:
      "China faces a complex week with escalating South China Sea tensions and severe flooding in Guangdong, while economic stimulus measures and BYD's global EV dominance paint a more optimistic domestic picture.",
    sentiment: "negative",
    sentimentScore: -0.35,
    keyActors: ["Xi Jinping", "PLA Navy", "BYD", "PBOC"],
    topicTags: ["geopolitics", "economy", "automotive", "disaster"],
    articleCount: 4,
    lastUpdated: "2026-03-28T09:00:00Z",
  },
  NG: {
    countryCode: "NG",
    summary:
      "Nigeria's tech ecosystem continues to attract major foreign investment, and the Naira shows signs of stabilization. Security challenges persist in the northeast with ongoing militant clashes, while Lagos advances key infrastructure projects.",
    sentiment: "neutral",
    sentimentScore: 0.05,
    keyActors: ["Central Bank of Nigeria", "Tinubu", "Military Command"],
    topicTags: ["fintech", "currency", "security", "infrastructure"],
    articleCount: 4,
    lastUpdated: "2026-03-28T09:00:00Z",
  },
  UA: {
    countryCode: "UA",
    summary:
      "Ukraine sees renewed hope as ceasefire talks resume in Geneva with a new framework, and NATO allies deliver fresh air defense systems. The humanitarian situation in Kharkiv remains dire, though the tech sector and power grid repairs show resilience.",
    sentiment: "negative",
    sentimentScore: -0.25,
    keyActors: ["Zelensky", "NATO", "Geneva mediators"],
    topicTags: ["conflict", "diplomacy", "defense", "economy"],
    articleCount: 5,
    lastUpdated: "2026-03-28T09:00:00Z",
  },
  AU: {
    countryCode: "AU",
    summary:
      "Australia secures a strategic critical minerals partnership with Japan, boosting its geopolitical position. Environmental concerns mount as the Great Barrier Reef faces its worst bleaching event, while the housing market begins to stabilize.",
    sentiment: "neutral",
    sentimentScore: 0.05,
    keyActors: ["Albanese", "RBA", "Japan PM"],
    topicTags: ["trade", "environment", "housing", "geopolitics"],
    articleCount: 3,
    lastUpdated: "2026-03-28T09:00:00Z",
  },
};

const GLOBAL_SENTIMENT: SentimentResponse = {
  countries: [
    { countryCode: "US", sentiment: "neutral", sentimentScore: 0.15 },
    { countryCode: "BR", sentiment: "positive", sentimentScore: 0.3 },
    { countryCode: "IN", sentiment: "positive", sentimentScore: 0.55 },
    { countryCode: "DE", sentiment: "neutral", sentimentScore: 0.1 },
    { countryCode: "CN", sentiment: "negative", sentimentScore: -0.35 },
    { countryCode: "NG", sentiment: "neutral", sentimentScore: 0.05 },
    { countryCode: "UA", sentiment: "negative", sentimentScore: -0.25 },
    { countryCode: "AU", sentiment: "neutral", sentimentScore: 0.05 },
    { countryCode: "GB", sentiment: "positive", sentimentScore: 0.2 },
    { countryCode: "FR", sentiment: "neutral", sentimentScore: 0.0 },
    { countryCode: "JP", sentiment: "positive", sentimentScore: 0.4 },
    { countryCode: "KR", sentiment: "positive", sentimentScore: 0.35 },
    { countryCode: "CA", sentiment: "positive", sentimentScore: 0.25 },
    { countryCode: "MX", sentiment: "negative", sentimentScore: -0.15 },
    { countryCode: "ZA", sentiment: "neutral", sentimentScore: -0.05 },
    { countryCode: "SA", sentiment: "neutral", sentimentScore: 0.1 },
    { countryCode: "RU", sentiment: "negative", sentimentScore: -0.5 },
    { countryCode: "IT", sentiment: "neutral", sentimentScore: 0.05 },
    { countryCode: "ES", sentiment: "positive", sentimentScore: 0.2 },
    { countryCode: "TR", sentiment: "negative", sentimentScore: -0.2 },
    { countryCode: "PL", sentiment: "positive", sentimentScore: 0.15 },
    { countryCode: "AR", sentiment: "negative", sentimentScore: -0.3 },
    { countryCode: "EG", sentiment: "neutral", sentimentScore: -0.05 },
    { countryCode: "TH", sentiment: "positive", sentimentScore: 0.25 },
    { countryCode: "ID", sentiment: "positive", sentimentScore: 0.15 },
    { countryCode: "PK", sentiment: "negative", sentimentScore: -0.3 },
    { countryCode: "BD", sentiment: "neutral", sentimentScore: -0.1 },
    { countryCode: "PH", sentiment: "negative", sentimentScore: -0.2 },
    { countryCode: "VN", sentiment: "positive", sentimentScore: 0.3 },
    { countryCode: "ET", sentiment: "crisis", sentimentScore: -0.6 },
    { countryCode: "KE", sentiment: "neutral", sentimentScore: 0.0 },
    { countryCode: "CO", sentiment: "neutral", sentimentScore: 0.05 },
    { countryCode: "SE", sentiment: "positive", sentimentScore: 0.35 },
    { countryCode: "NO", sentiment: "positive", sentimentScore: 0.4 },
    { countryCode: "IL", sentiment: "crisis", sentimentScore: -0.7 },
    { countryCode: "CL", sentiment: "neutral", sentimentScore: 0.0 },
    { countryCode: "PE", sentiment: "negative", sentimentScore: -0.15 },
    { countryCode: "GR", sentiment: "neutral", sentimentScore: 0.05 },
    { countryCode: "NZ", sentiment: "positive", sentimentScore: 0.3 },
    { countryCode: "IR", sentiment: "crisis", sentimentScore: -0.65 },
    { countryCode: "IQ", sentiment: "crisis", sentimentScore: -0.55 },
  ],
  generatedAt: "2026-03-28T09:00:00Z",
};

export function getMockNews(countryCode: string): NewsResponse | null {
  return NEWS_DATA[countryCode] ?? null;
}

export function getMockBrief(countryCode: string): BriefResponse | null {
  return BRIEF_DATA[countryCode] ?? null;
}

export function getMockGlobalSentiment(): SentimentResponse {
  return GLOBAL_SENTIMENT;
}
