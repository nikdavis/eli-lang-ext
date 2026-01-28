// Core state shape
export interface EliState {
  enabled: boolean;
  targetLang: LanguageCode;
  nativeLang: LanguageCode;
  difficulty: number; // 0-1, 0 = peppa pig, 1 = original complexity

  provider: LLMProviderID;
  apiKeys: Partial<Record<LLMProviderID, string>>;
  model: string;

  // Per-site enable/disable
  siteEnabled: Record<string, boolean>;
}

export type LLMProviderID = "fireworks" | "openai" | "google";

export type LanguageCode =
  | "de" // German
  | "es" // Spanish
  | "fr" // French
  | "it" // Italian
  | "pt" // Portuguese
  | "ja" // Japanese
  | "ko" // Korean
  | "zh" // Chinese
  | "ru" // Russian
  | "nl" // Dutch
  | "en"; // English (for native lang)

export interface LLMProvider {
  id: LLMProviderID;
  name: string;
  models: { id: string; name: string }[];
  baseUrl: string;
  keyPlaceholder: string;
  docsUrl: string;
}

// Text chunk for translation
export interface TextChunk {
  id: string;
  text: string;
  selector?: string; // CSS path back to element
}

export interface TranslatedChunk {
  id: string;
  translated: string;
}

// Messages between content script and background
export type Message =
  | { type: "TRANSLATE_CHUNKS"; chunks: TextChunk[]; targetLang: string; difficulty: number }
  | { type: "TRANSLATE_RESULT"; chunks: TranslatedChunk[] }
  | { type: "GET_STATE" }
  | { type: "STATE_UPDATE"; state: Partial<EliState> }
  | { type: "TOGGLE_SITE"; domain: string; enabled: boolean };
