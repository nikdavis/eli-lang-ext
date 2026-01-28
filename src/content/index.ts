import type { EliState, TextChunk, Message } from "../shared/types.js";
import { DEFAULT_STATE } from "../shared/config.js";
import { extractChunks } from "./extractor.js";
import { injectTranslations, revertTranslations } from "./injector.js";
import { startObserver, stopObserver } from "./observer.js";
import { initSelection, updateSelectionState } from "./selection.js";
import { showProgress, updateProgress, hideProgress } from "./progress.js";

let state: EliState = DEFAULT_STATE;
let isTranslating = false;

const BATCH_SIZE = 10;
const MAX_CONCURRENT = 3;

function getDomain(): string {
  return window.location.hostname;
}

function isEnabledForSite(): boolean {
  if (!state.enabled) return false;
  const domain = getDomain();
  if (state.siteEnabled[domain] === false) return false;
  return state.siteEnabled[domain] === true || Object.keys(state.siteEnabled).length === 0 || state.siteEnabled[domain] === undefined;
}

async function init() {
  try {
    const response = await browser.runtime.sendMessage({ type: "GET_STATE" });
    if (response) {
      state = response as EliState;
    }
  } catch (e) {
    console.log("[eli-lang] Failed to get state:", e);
  }

  console.log("[eli-lang] State:", { enabled: state.enabled, provider: state.provider, hasKey: !!state.apiKeys[state.provider] });

  initSelection(state);

  if (isEnabledForSite()) {
    console.log("[eli-lang] Starting translation...");
    await translatePage();
    startObserver();
  } else {
    console.log("[eli-lang] Not enabled for this site");
  }
}

browser.runtime.onMessage.addListener((message: unknown) => {
  const msg = message as Message;
  if (msg.type === "STATE_UPDATE") {
    const wasEnabled = isEnabledForSite();
    state = { ...state, ...msg.state };
    updateSelectionState(state);
    const nowEnabled = isEnabledForSite();

    if (!wasEnabled && nowEnabled) {
      translatePage();
      startObserver();
    } else if (wasEnabled && !nowEnabled) {
      stopObserver();
      revertTranslations();
    }
  }
});

async function translatePage() {
  if (isTranslating) return;
  isTranslating = true;

  try {
    const chunks = extractChunks();
    console.log(`[eli-lang] Extracted ${chunks.length} chunks`);
    if (chunks.length === 0) return;

    await translateInBatches(chunks);
  } catch (e) {
    console.log("[eli-lang] Translation error:", e);
  } finally {
    isTranslating = false;
  }
}

async function translateInBatches(chunks: TextChunk[]) {
  const total = chunks.length;
  let completed = 0;

  showProgress(total);

  // Split into batches
  const batches: TextChunk[][] = [];
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    batches.push(chunks.slice(i, i + BATCH_SIZE));
  }

  // Process batches with concurrency limit
  const pending: Promise<void>[] = [];
  let batchIndex = 0;

  const processBatch = async (batch: TextChunk[], batchNum: number) => {
    console.log(`[eli-lang] Sending batch ${batchNum} (${batch.length} chunks)`);
    try {
      const response = await browser.runtime.sendMessage({
        type: "TRANSLATE_CHUNKS",
        chunks: batch,
        targetLang: state.targetLang,
        difficulty: state.difficulty,
      }) as { error?: string; chunks?: { id: string; translated: string }[] } | undefined;

      if (response?.error) {
        console.log(`[eli-lang] Batch ${batchNum} error:`, response.error);
      } else if (response?.chunks) {
        console.log(`[eli-lang] Batch ${batchNum} complete, got ${response.chunks.length} translations`);
        injectTranslations(response.chunks);
      }
    } catch (e) {
      console.log(`[eli-lang] Batch ${batchNum} failed:`, e);
    }
    completed += batch.length;
    updateProgress(completed, total);
  };

  while (batchIndex < batches.length || pending.length > 0) {
    // Start new batches up to concurrency limit
    while (pending.length < MAX_CONCURRENT && batchIndex < batches.length) {
      const batch = batches[batchIndex];
      const batchNum = batchIndex + 1;
      batchIndex++;
      const p = processBatch(batch, batchNum).then(() => {
        pending.splice(pending.indexOf(p), 1);
      });
      pending.push(p);
    }

    // Wait for at least one to complete
    if (pending.length > 0) {
      await Promise.race(pending);
    }
  }

  hideProgress();
}

export async function translateAndInject(chunks: TextChunk[]) {
  if (chunks.length === 0) return;
  await translateInBatches(chunks);
}

init();
console.log("[eli-lang] Content script loaded");
