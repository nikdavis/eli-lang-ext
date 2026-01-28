import type { Message, TextChunk } from "../shared/types.js";
import type { Runtime } from "webextension-polyfill";
import { translateChunks, translateSingle } from "./llm.js";
import { getState, setState, toggleSite } from "./state.js";

// Listen for messages from content scripts and popup
browser.runtime.onMessage.addListener((message: unknown, sender: Runtime.MessageSender) => {
  return handleMessage(message as Message, sender);
});

async function handleMessage(message: Message, _sender: Runtime.MessageSender): Promise<unknown> {
  switch (message.type) {
    case "GET_STATE":
      return getState();

    case "STATE_UPDATE":
      return setState(message.state);

    case "TOGGLE_SITE":
      return toggleSite(message.domain, message.enabled);

    case "TRANSLATE_CHUNKS":
      return handleTranslate(message.chunks, message.targetLang, message.difficulty);

    case "TRANSLATE_SELECTION":
      return handleSelectionTranslate((message as any).text, (message as any).targetLang);

    default:
      return null;
  }
}

async function handleTranslate(
  chunks: TextChunk[],
  targetLang: string,
  difficulty: number
) {
  const state = await getState();

  if (!state.enabled) {
    return { chunks: [] };
  }

  try {
    const translated = await translateChunks(chunks, targetLang, difficulty, state);
    return { type: "TRANSLATE_RESULT", chunks: translated };
  } catch (error) {
    return { error: String(error) };
  }
}

async function handleSelectionTranslate(text: string, targetLang: string) {
  const state = await getState();

  try {
    const translation = await translateSingle(text, targetLang, state);
    return { translation };
  } catch (error) {
    return { error: String(error) };
  }
}

// Background script ready
