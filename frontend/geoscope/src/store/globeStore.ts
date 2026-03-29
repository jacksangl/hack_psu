import { create } from "zustand";
import type {
  BriefResponse,
  NewsResponse,
  SentimentEntry,
  NewsCategory,
} from "../data/news/types";

interface GlobeState {
  selectedCountry: string | null;
  hoveredCountry: string | null;
  hoveredScreenPosition: { x: number; y: number } | null;
  hoveredStoryTitle: string | null;
  activeDate: Date;
  connectDotsMode: boolean;
  selectedCategory: NewsCategory | null;
  globalSentiment: Record<string, SentimentEntry>;
  countryNews: Record<string, NewsResponse>;
  countryBriefs: Record<string, BriefResponse>;
  isLoading: boolean;
  error: string | null;
  isCameraAnimating: boolean;
  isInteracting: boolean;
  heatmapDirty: boolean;

  selectCountry: (code: string) => void;
  clearSelectedCountry: () => void;
  setHoveredCountry: (code: string | null) => void;
  setHoveredStoryTitle: (title: string | null) => void;
  setHoveredScreenPosition: (position: { x: number; y: number } | null) => void;
  clearHoveredItem: () => void;
  setActiveDate: (date: Date) => void;
  toggleConnectDots: () => void;
  setSelectedCategory: (category: NewsCategory | null) => void;
  setGlobalSentiment: (data: Record<string, SentimentEntry>) => void;
  setCountryNews: (code: string, data: NewsResponse) => void;
  setCountryBrief: (code: string, data: BriefResponse) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCameraAnimating: (animating: boolean) => void;
  setIsInteracting: (interacting: boolean) => void;
  setHeatmapDirty: (dirty: boolean) => void;
}

export const useGlobeStore = create<GlobeState>((set) => ({
  selectedCountry: null,
  hoveredCountry: null,
  hoveredScreenPosition: null,
  hoveredStoryTitle: null,
  activeDate: new Date(),
  connectDotsMode: false,
  selectedCategory: null,
  globalSentiment: {},
  countryNews: {},
  countryBriefs: {},
  isLoading: false,
  error: null,
  isCameraAnimating: false,
  isInteracting: false,
  heatmapDirty: true,

  selectCountry: (code) => set({ selectedCountry: code }),
  clearSelectedCountry: () => set({ selectedCountry: null }),
  setHoveredCountry: (code) => set({ hoveredCountry: code }),
  setHoveredStoryTitle: (title) => set({ hoveredStoryTitle: title }),
  setHoveredScreenPosition: (position) => set({ hoveredScreenPosition: position }),
  clearHoveredItem: () =>
    set({
      hoveredCountry: null,
      hoveredScreenPosition: null,
      hoveredStoryTitle: null,
    }),
  setActiveDate: (date) => set({ activeDate: date }),
  toggleConnectDots: () =>
    set((state) => ({ connectDotsMode: !state.connectDotsMode })),
  setSelectedCategory: (category) =>
    set({ selectedCategory: category, heatmapDirty: true }),
  setGlobalSentiment: (data) => set({ globalSentiment: data, heatmapDirty: true }),
  setCountryNews: (code, data) =>
    set((state) => ({
      countryNews: { ...state.countryNews, [code]: data },
      heatmapDirty: true,
    })),
  setCountryBrief: (code, data) =>
    set((state) => ({
      countryBriefs: { ...state.countryBriefs, [code]: data },
    })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setCameraAnimating: (animating) => set({ isCameraAnimating: animating }),
  setIsInteracting: (interacting) => set({ isInteracting: interacting }),
  setHeatmapDirty: (dirty) => set({ heatmapDirty: dirty }),
}));
