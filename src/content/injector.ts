import type { TranslatedChunk } from "../shared/types.js";

/**
 * Inject translated text back into the DOM
 */
export function injectTranslations(chunks: TranslatedChunk[]) {
  console.log("eli-lang: Injecting chunks:", chunks);

  for (const chunk of chunks) {
    const element = document.querySelector(`[data-eli-chunk-id="${chunk.id}"]`);
    if (!element) {
      console.warn(`eli-lang: Could not find element for chunk ${chunk.id}`);
      continue;
    }

    console.log(`eli-lang: Replacing "${element.textContent?.slice(0, 30)}..." with "${chunk.translated?.slice(0, 30)}..."`);

    // Store original text for potential revert
    if (!element.hasAttribute("data-eli-original")) {
      element.setAttribute("data-eli-original", element.textContent || "");
    }

    // Replace text content
    element.textContent = chunk.translated;

    // Mark as translated
    element.setAttribute("data-eli-translated", "true");
  }
}

/**
 * Revert all translations on the page
 */
export function revertTranslations() {
  const translated = document.querySelectorAll("[data-eli-translated]");

  for (const element of translated) {
    const original = element.getAttribute("data-eli-original");
    if (original) {
      element.textContent = original;
    }
    element.removeAttribute("data-eli-translated");
    element.removeAttribute("data-eli-original");
    element.removeAttribute("data-eli-chunk-id");
  }
}

/**
 * Check if an element has already been translated
 */
export function isTranslated(element: Element): boolean {
  return element.hasAttribute("data-eli-translated") ||
    !!element.closest("[data-eli-translated]");
}
