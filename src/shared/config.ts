import type { LLMProvider, EliState, LanguageCode } from "./types.js";

export const PROVIDERS: LLMProvider[] = [
  {
    id: "fireworks",
    name: "Fireworks",
    models: [
      { id: "accounts/fireworks/models/qwen3-30b-a3b", name: "Qwen3 30B A3B (fast)" },
      { id: "accounts/fireworks/models/gpt-oss-20b", name: "GPT-OSS 20B" },
      { id: "accounts/fireworks/models/qwen3-8b", name: "Qwen3 8B" },
    ],
    baseUrl: "https://api.fireworks.ai/inference/v1",
    keyPlaceholder: "fw_...",
    docsUrl: "https://fireworks.ai/api-keys",
  },
  // Stubbed - update models when ready
  {
    id: "openai",
    name: "OpenAI",
    models: [
      { id: "TODO", name: "TODO" },
    ],
    baseUrl: "https://api.openai.com/v1",
    keyPlaceholder: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  // Stubbed - update models when ready
  {
    id: "google",
    name: "Google AI",
    models: [
      { id: "TODO", name: "TODO" },
    ],
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    keyPlaceholder: "AIza...",
    docsUrl: "https://aistudio.google.com/apikey",
  },
];

export const LANGUAGES: { code: LanguageCode; name: string; flag: string }[] = [
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "en", name: "English", flag: "🇬🇧" },
];

export function getLanguageName(code: LanguageCode): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

export const DEFAULT_STATE: EliState = {
  enabled: false,
  targetLang: "de",
  nativeLang: "en",
  difficulty: 0.3, // lean towards simpler

  provider: "fireworks",
  apiKeys: {},
  model: "accounts/fireworks/models/qwen3-30b-a3b",

  siteEnabled: {},
};

export function getProvider(id: string): LLMProvider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}
