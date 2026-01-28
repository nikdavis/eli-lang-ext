import type { TextChunk } from "./types.js";
import { getLanguageName } from "./config.js";
import type { LanguageCode } from "./types.js";

export function buildTranslatePrompt(
  chunks: TextChunk[],
  targetLang: string,
  difficulty: number
): string {
  const difficultyDesc = describeDifficulty(difficulty);

  return `You are a language learning assistant. Your task is to rewrite text for language learners.

TARGET LANGUAGE: ${targetLang}
DIFFICULTY LEVEL: ${difficulty.toFixed(2)} (${difficultyDesc})

DIFFICULTY SCALE:
- 0.0 = "Peppa Pig" level: Very simple vocabulary (A1), short sentences, explain complex concepts in basic terms
- 0.3 = Beginner friendly: Simple vocabulary (A1-A2), straightforward sentences
- 0.5 = Intermediate: Moderate vocabulary (B1), natural sentence structure
- 0.7 = Upper intermediate: Richer vocabulary (B2), closer to native expression
- 1.0 = Native level: Preserve original complexity, natural idiomatic expression

INSTRUCTIONS:
1. Translate AND simplify each text chunk to match the difficulty level
2. At low difficulty, simplify complex concepts - don't just translate literally
3. Preserve the core meaning but adapt vocabulary and sentence structure
4. Return ONLY valid JSON - no markdown, no explanation

INPUT CHUNKS:
${JSON.stringify(chunks, null, 2)}

OUTPUT FORMAT (return exactly this structure):
{
  "chunks": [
    { "id": "chunk-id-here", "translated": "translated text here" }
  ]
}

Translate now:`;
}

function describeDifficulty(d: number): string {
  if (d <= 0.2) return "very simple, like a children's book";
  if (d <= 0.4) return "beginner friendly";
  if (d <= 0.6) return "intermediate";
  if (d <= 0.8) return "upper intermediate";
  return "native level complexity";
}

export function buildSelectionPrompt(text: string, targetLang: string): string {
  const langName = getLanguageName(targetLang as LanguageCode);

  return `Translate the following text to ${langName}.
Return ONLY the translation, nothing else. No explanations, no quotes, just the translated text.

Text: ${text}

Translation:`;
}
