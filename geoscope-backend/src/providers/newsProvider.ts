export interface ProviderNewsArticle {
  rawId?: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  description?: string | null;
  imageUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string | null;
  topics?: string[];
  toneScore?: number | null;
}

export interface FetchCountryNewsParams {
  countryCode: string;
  countryName: string;
  limit: number;
  from?: string;
  to?: string;
  topic?: string;
}

export interface NewsProvider {
  readonly name: string;
  fetchCountryNews(params: FetchCountryNewsParams): Promise<ProviderNewsArticle[]>;
}
