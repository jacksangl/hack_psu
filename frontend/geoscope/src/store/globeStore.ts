import { create } from "zustand";
import type {
  NewsResponse,
  BriefResponse,
  SentimentResponse,
  SentimentEntry,
  NewsCategory,
} from "../api/mockData";

interface GlobeState {
  selectedCountry: string | null;
  hoveredCountry: string | null;
  activeDate: Date;
  connectDotsMode: boolean;
  selectedCategory: NewsCategory | null;
  globalSentiment: Record<string, SentimentEntry>;
  countryNews: Record<string, NewsResponse>;
  countryBriefs: Record<string, BriefResponse>;
  isLoading: boolean;
  error: string | null;
  isCameraAnimating: boolean;

  selectCountry: (code: string) => void;
  clearSelectedCountry: () => void;
  setHoveredCountry: (code: string | null) => void;
  setActiveDate: (date: Date) => void;
  toggleConnectDots: () => void;
  setSelectedCategory: (category: NewsCategory | null) => void;
  setGlobalSentiment: (data: SentimentResponse) => void;
  setCountryNews: (code: string, data: NewsResponse) => void;
  setCountryBrief: (code: string, data: BriefResponse) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCameraAnimating: (animating: boolean) => void;
}

export const useGlobeStore = create<GlobeState>((set) => ({
  selectedCountry: null,
  hoveredCountry: null,
  activeDate: new Date(),
  connectDotsMode: false,
  selectedCategory: null,
  globalSentiment: {},
  countryNews: {},
  countryBriefs: {},
  isLoading: false,
  error: null,
  isCameraAnimating: false,

  selectCountry: (code) => set({ selectedCountry: code }),
  clearSelectedCountry: () => set({ selectedCountry: null }),
  setHoveredCountry: (code) => set({ hoveredCountry: code }),
  setActiveDate: (date) => set({ activeDate: date }),
  toggleConnectDots: () =>
    set((state) => ({ connectDotsMode: !state.connectDotsMode })),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setGlobalSentiment: (data) => {
    const map: Record<string, SentimentEntry> = {};
    for (const entry of data.countries) {
      map[entry.countryCode] = entry;
    }
    set({ globalSentiment: map });
  },
  setCountryNews: (code, data) =>
    set((state) => ({
      countryNews: { ...state.countryNews, [code]: data },
    })),
  setCountryBrief: (code, data) =>
    set((state) => ({
      countryBriefs: { ...state.countryBriefs, [code]: data },
    })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setCameraAnimating: (animating) => set({ isCameraAnimating: animating }),
}));
