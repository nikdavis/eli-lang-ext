import { extractFromNodes } from "./extractor.js";
import { translateAndInject } from "./index.js";

let observer: MutationObserver | null = null;
let pending: Set<Node> = new Set();
let debounceTimer: number | null = null;

const DEBOUNCE_MS = 500;

/**
 * Start observing DOM for new content
 */
export function startObserver() {
  if (observer) return;

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          pending.add(node);
        }
      }
    }

    scheduleFlush();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log("eli-lang: Observer started");
}

/**
 * Stop observing
 */
export function stopObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  pending.clear();
  console.log("eli-lang: Observer stopped");
}

function scheduleFlush() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(flush, DEBOUNCE_MS);
}

async function flush() {
  const nodes = [...pending];
  pending.clear();

  if (nodes.length === 0) return;

  const chunks = extractFromNodes(nodes);
  if (chunks.length === 0) return;

  console.log(`eli-lang: Translating ${chunks.length} new chunks`);
  await translateAndInject(chunks);
}
