import type { EliState } from "../shared/types.js";

let popup: HTMLElement | null = null;
let currentState: EliState | null = null;

export function initSelection(state: EliState) {
  currentState = state;
  document.addEventListener("mouseup", handleMouseUp);
  document.addEventListener("keydown", hidePopup);
  createPopup();
}

export function updateSelectionState(state: EliState) {
  currentState = state;
}

function createPopup() {
  popup = document.createElement("div");
  popup.id = "eli-selection-popup";
  popup.innerHTML = `
    <div class="eli-popup-content">
      <div class="eli-popup-original"></div>
      <div class="eli-popup-divider"></div>
      <div class="eli-popup-translation"></div>
    </div>
  `;
  popup.style.cssText = `
    position: absolute;
    z-index: 999999;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 12px;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    display: none;
  `;

  const style = document.createElement("style");
  style.textContent = `
    #eli-selection-popup .eli-popup-original {
      color: #4CAF50;
      margin-bottom: 8px;
      font-weight: 500;
    }
    #eli-selection-popup .eli-popup-divider {
      height: 1px;
      background: #333;
      margin: 8px 0;
    }
    #eli-selection-popup .eli-popup-translation {
      color: #e0e0e0;
    }
    #eli-selection-popup .eli-popup-loading {
      color: #888;
      font-style: italic;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(popup);
}

async function handleMouseUp(e: MouseEvent) {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    hidePopup();
    return;
  }

  const text = selection.toString().trim();
  if (!text || text.length < 2) {
    hidePopup();
    return;
  }

  // Only show popup if selection is reasonable length
  if (text.length > 500) {
    hidePopup();
    return;
  }

  // Show popup near selection
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  showPopup(text, rect, e);
}

async function showPopup(text: string, rect: DOMRect, e: MouseEvent) {
  if (!popup || !currentState) return;

  const originalEl = popup.querySelector(".eli-popup-original") as HTMLElement;
  const translationEl = popup.querySelector(".eli-popup-translation") as HTMLElement;

  originalEl.textContent = text;
  translationEl.innerHTML = '<span class="eli-popup-loading">Translating...</span>';

  // Position popup above selection
  popup.style.display = "block";
  const popupRect = popup.getBoundingClientRect();

  let top = rect.top + window.scrollY - popupRect.height - 10;
  let left = rect.left + window.scrollX + (rect.width / 2) - (popupRect.width / 2);

  // Keep within viewport
  if (top < window.scrollY + 10) {
    top = rect.bottom + window.scrollY + 10;
  }
  if (left < 10) left = 10;
  if (left + popupRect.width > window.innerWidth - 10) {
    left = window.innerWidth - popupRect.width - 10;
  }

  popup.style.top = `${top}px`;
  popup.style.left = `${left}px`;

  // Translate to native language
  try {
    const response = await browser.runtime.sendMessage({
      type: "TRANSLATE_SELECTION",
      text,
      targetLang: currentState.nativeLang,
    }) as { translation?: string; error?: string };

    if (response?.translation) {
      translationEl.textContent = response.translation;
    } else if (response?.error) {
      translationEl.textContent = `Error: ${response.error}`;
    }
  } catch (err) {
    translationEl.textContent = "Translation failed";
    console.error("eli-lang: Selection translation failed", err);
  }
}

function hidePopup() {
  if (popup) {
    popup.style.display = "none";
  }
}

// Hide on click outside
document.addEventListener("mousedown", (e) => {
  if (popup && !popup.contains(e.target as Node)) {
    hidePopup();
  }
});
