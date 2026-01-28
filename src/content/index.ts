import type { EliState, TextChunk, Message } from "../shared/types.js";
import { DEFAULT_STATE } from "../shared/config.js";
import { extractChunks } from "./extractor.js";
import { injectTranslations, revertTranslations } from "./injector.js";
import { startObserver, stopObserver } from "./observer.js";
import { initSelection, updateSelectionState } from "./selection.js";

let state: EliState = DEFAULT_STATE;
let isTranslating = false;

// Get current domain
function getDomain(): string {
  return window.location.hostname;
}

// Check if translation is enabled for current site
function isEnabledForSite(): boolean {
  if (!state.enabled) return false;
  const domain = getDomain();
  // If site is explicitly disabled, don't translate
  if (state.siteEnabled[domain] === false) return false;
  // If site is explicitly enabled OR no preference, translate
  return state.siteEnabled[domain] === true || Object.keys(state.siteEnabled).length === 0 || state.siteEnabled[domain] === undefined;
}

// Initialize: get state and set up
async function init() {
  try {
    const response = await browser.runtime.sendMessage({ type: "GET_STATE" });
    if (response) {
      state = response as EliState;
    }
  } catch (e) {
    console.warn("eli-lang: Could not get initial state", e);
  }

  // Always init selection popup (works even when translation is off)
  initSelection(state);

  if (isEnabledForSite()) {
    await translatePage();
    startObserver();
  }
}

// Listen for state updates from background
browser.runtime.onMessage.addListener((message: unknown) => {
  const msg = message as Message;
  if (msg.type === "STATE_UPDATE") {
    const wasEnabled = isEnabledForSite();
    state = { ...state, ...msg.state };
    updateSelectionState(state);
    const nowEnabled = isEnabledForSite();

    if (!wasEnabled && nowEnabled) {
      // Just enabled - translate page
      translatePage();
      startObserver();
    } else if (wasEnabled && !nowEnabled) {
      // Just disabled - revert
      stopObserver();
      revertTranslations();
    }
  }
});

// Translate the current page
async function translatePage() {
  if (isTranslating) return;
  isTranslating = true;

  console.log("eli-lang: Starting page translation");

  try {
    const chunks = extractChunks();
    if (chunks.length === 0) {
      console.log("eli-lang: No text chunks found");
      return;
    }

    console.log(`eli-lang: Found ${chunks.length} chunks to translate`);
    await translateAndInject(chunks);
  } catch (e) {
    console.error("eli-lang: Translation error", e);
  } finally {
    isTranslating = false;
  }
}

// Send chunks to background for translation and inject results
export async function translateAndInject(chunks: TextChunk[]) {
  if (chunks.length === 0) return;

  try {
    const response = await browser.runtime.sendMessage({
      type: "TRANSLATE_CHUNKS",
      chunks,
      targetLang: state.targetLang,
      difficulty: state.difficulty,
    }) as { error?: string; chunks?: { id: string; translated: string }[] } | undefined;

    if (response?.error) {
      console.error("eli-lang: Translation failed", response.error);
      return;
    }

    if (response?.chunks) {
      injectTranslations(response.chunks);
      console.log(`eli-lang: Injected ${response.chunks.length} translations`);
    }
  } catch (e) {
    console.error("eli-lang: Failed to send translation request", e);
  }
}

// Start
init();
console.log("eli-lang: Content script loaded");
