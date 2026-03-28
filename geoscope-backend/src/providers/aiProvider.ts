import type { Article } from "../types/article";
import type { BriefDraft } from "../types/brief";

export interface GenerateBriefParams {
  countryCode: string;
  countryName: string;
  articles: Article[];
}

export interface AiProvider {
  readonly name: string;
  generateBrief(params: GenerateBriefParams): Promise<BriefDraft>;
}
