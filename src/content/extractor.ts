import type { TextChunk } from "../shared/types.js";

// Elements that contain translatable content (block-level text containers)
const CONTENT_TAGS = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "TD", "TH", "BLOCKQUOTE", "FIGCAPTION"]);

// Elements to skip entirely
const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "OBJECT", "EMBED",
  "SVG", "CANVAS", "VIDEO", "AUDIO", "CODE", "PRE", "KBD", "VAR", "SAMP",
  "INPUT", "TEXTAREA", "NAV", "HEADER", "FOOTER", "ASIDE",
]);

// Skip elements matching these selectors
const SKIP_SELECTORS = [
  "nav", "header", "footer", "aside",
  "[role='navigation']", "[role='banner']", "[role='complementary']",
  ".sidebar", ".nav", ".menu", ".footer", ".header", ".toc",
  "#mw-navigation", "#mw-panel", "#p-navigation", "#toc",
  ".vector-menu", ".vector-header", ".mw-editsection",
  ".reference", ".reflist", // Skip references
].join(",");

// Minimum text length
const MIN_TEXT_LENGTH = 40;

// Maximum chunks per batch
const MAX_CHUNKS_PER_BATCH = 15;

let chunkIdCounter = 0;

/**
 * Check if element or any ancestor is editable
 */
function isEditable(el: Element | null): boolean {
  while (el) {
    if (el instanceof HTMLElement && el.isContentEditable) return true;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return true;
    if (el.getAttribute("role") === "textbox") return true;
    el = el.parentElement;
  }
  return false;
}

/**
 * Check if element should be skipped
 */
function shouldSkip(el: Element): boolean {
  if (SKIP_TAGS.has(el.tagName)) return true;
  if (el.closest(SKIP_SELECTORS)) return true;
  if (el.closest("[data-eli-translated]")) return true;
  if (isEditable(el)) return true;

  // Skip hidden elements
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return true;

  return false;
}

/**
 * Extract whole paragraph/heading elements for translation
 */
export function extractChunks(root: Element = document.body): TextChunk[] {
  const chunks: TextChunk[] = [];
  const seen = new Set<string>();

  // Find all content elements (paragraphs, headings, list items)
  const elements = root.querySelectorAll(
    Array.from(CONTENT_TAGS).join(",")
  );

  for (const el of elements) {
    if (chunks.length >= MAX_CHUNKS_PER_BATCH) break;

    if (shouldSkip(el)) continue;
    if (el.closest("[data-eli-chunk-id]")) continue; // Already processed

    const text = el.textContent?.trim();
    if (!text || text.length < MIN_TEXT_LENGTH) continue;

    // Dedupe identical text
    if (seen.has(text)) continue;
    seen.add(text);

    const id = `eli-${++chunkIdCounter}`;
    el.setAttribute("data-eli-chunk-id", id);

    chunks.push({ id, text });
  }

  console.log(`eli-lang: Extracted ${chunks.length} content blocks`);
  return chunks;
}

/**
 * Extract from newly added nodes only (for MutationObserver)
 */
export function extractFromNodes(nodes: Node[]): TextChunk[] {
  const chunks: TextChunk[] = [];

  for (const node of nodes) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      if (!element.closest("[data-eli-translated]")) {
        chunks.push(...extractChunks(element));
      }
    }
  }

  return chunks.slice(0, MAX_CHUNKS_PER_BATCH);
}
