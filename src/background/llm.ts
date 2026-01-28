import type { TextChunk, TranslatedChunk, EliState } from "../shared/types.js";
import { buildTranslatePrompt, buildSelectionPrompt } from "../shared/prompts.js";
import { getProvider } from "../shared/config.js";

const MAX_RETRIES = 3;
const TIMEOUT_MS = 30000;

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok && retries > 0 && response.status >= 500) {
      await new Promise(r => setTimeout(r, 1000 * (MAX_RETRIES - retries + 1)));
      return fetchWithRetry(url, options, retries - 1);
    }
    return response;
  } catch (e) {
    clearTimeout(timeout);
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000 * (MAX_RETRIES - retries + 1)));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw e;
  }
}

export async function translateChunks(
  chunks: TextChunk[],
  targetLang: string,
  difficulty: number,
  state: EliState
): Promise<TranslatedChunk[]> {
  const provider = getProvider(state.provider);
  if (!provider) {
    throw new Error(`Unknown provider: ${state.provider}`);
  }

  const apiKey = state.apiKeys[state.provider];
  if (!apiKey) {
    throw new Error(`No API key configured for ${provider.name}`);
  }

  // For now, only Fireworks is implemented
  if (state.provider === "fireworks") {
    return callFireworks(chunks, targetLang, difficulty, apiKey, state.model);
  }

  // Stub for other providers
  throw new Error(`Provider ${state.provider} not yet implemented`);
}

export async function translateSingle(
  text: string,
  targetLang: string,
  state: EliState
): Promise<string> {
  const provider = getProvider(state.provider);
  if (!provider) {
    throw new Error(`Unknown provider: ${state.provider}`);
  }

  const apiKey = state.apiKeys[state.provider];
  if (!apiKey) {
    throw new Error(`No API key configured for ${provider.name}`);
  }

  const prompt = buildSelectionPrompt(text, targetLang);

  const response = await fetchWithRetry("https://api.fireworks.ai/inference/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: state.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content || "";

  // Strip thinking tags
  content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  return content;
}

async function callFireworks(
  chunks: TextChunk[],
  targetLang: string,
  difficulty: number,
  apiKey: string,
  model: string
): Promise<TranslatedChunk[]> {
  const prompt = buildTranslatePrompt(chunks, targetLang, difficulty);

  const response = await fetchWithRetry("https://api.fireworks.ai/inference/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    throw new Error(`Fireworks API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in Fireworks response");
  }

  // Parse JSON response
  try {
    let jsonStr = content.trim();

    // Qwen3 outputs <think>...</think> tags before response - strip them
    jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    // Handle markdown code blocks
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    // Try to find JSON object if there's extra text
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr);
    return parsed.chunks as TranslatedChunk[];
  } catch (e) {
    throw new Error(`Failed to parse translation response`);
  }
}
