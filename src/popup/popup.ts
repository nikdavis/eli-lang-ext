import type { EliState } from "../shared/types.js";
import { LANGUAGES, DEFAULT_STATE } from "../shared/config.js";

let state: EliState = DEFAULT_STATE;
let currentDomain = "";

// Elements
const enabledToggle = document.getElementById("enabled") as HTMLInputElement;
const targetLangSelect = document.getElementById("target-lang") as HTMLSelectElement;
const difficultySlider = document.getElementById("difficulty") as HTMLInputElement;
const difficultyDesc = document.getElementById("difficulty-desc") as HTMLElement;
const siteEnabledCheckbox = document.getElementById("site-enabled") as HTMLInputElement;
const siteDomainSpan = document.getElementById("site-domain") as HTMLElement;
const noKeyWarning = document.getElementById("no-key-warning") as HTMLElement;
const openSettingsLink = document.getElementById("open-settings") as HTMLAnchorElement;
const openSettingsFooter = document.getElementById("open-settings-footer") as HTMLAnchorElement;

// Initialize
async function init() {
  // Populate language dropdown
  for (const lang of LANGUAGES) {
    if (lang.code === "en") continue; // Skip English as target
    const option = document.createElement("option");
    option.value = lang.code;
    option.textContent = `${lang.flag} ${lang.name}`;
    targetLangSelect.appendChild(option);
  }

  // Get current tab domain
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      const url = new URL(tab.url);
      currentDomain = url.hostname;
      siteDomainSpan.textContent = currentDomain;
    }
  } catch (e) {
    console.warn("Could not get current tab", e);
  }

  // Load state
  try {
    const response = await browser.runtime.sendMessage({ type: "GET_STATE" });
    if (response) {
      state = response as EliState;
    }
  } catch (e) {
    console.warn("Could not load state", e);
  }

  // Update UI
  updateUI();

  // Set up event listeners
  enabledToggle.addEventListener("change", handleEnabledChange);
  targetLangSelect.addEventListener("change", handleLangChange);
  difficultySlider.addEventListener("input", handleDifficultyChange);
  siteEnabledCheckbox.addEventListener("change", handleSiteToggle);
  openSettingsLink.addEventListener("click", openSettings);
  openSettingsFooter.addEventListener("click", openSettings);
}

function updateUI() {
  // Check for API key
  const hasKey = !!state.apiKeys[state.provider];
  noKeyWarning.style.display = hasKey ? "none" : "block";

  enabledToggle.checked = state.enabled;
  targetLangSelect.value = state.targetLang;
  difficultySlider.value = String(state.difficulty);
  updateDifficultyDesc(state.difficulty);

  // Site-specific toggle
  if (currentDomain) {
    const siteEnabled = state.siteEnabled[currentDomain];
    siteEnabledCheckbox.checked = siteEnabled !== false;
  }
}

function updateDifficultyDesc(value: number) {
  if (value <= 0.2) {
    difficultyDesc.textContent = "Very simple (Peppa Pig level)";
  } else if (value <= 0.4) {
    difficultyDesc.textContent = "Beginner friendly";
  } else if (value <= 0.6) {
    difficultyDesc.textContent = "Intermediate";
  } else if (value <= 0.8) {
    difficultyDesc.textContent = "Upper intermediate";
  } else {
    difficultyDesc.textContent = "Native level";
  }
}

async function handleEnabledChange() {
  state.enabled = enabledToggle.checked;
  await saveState({ enabled: state.enabled });
}

async function handleLangChange() {
  state.targetLang = targetLangSelect.value as EliState["targetLang"];
  await saveState({ targetLang: state.targetLang });
}

async function handleDifficultyChange() {
  state.difficulty = parseFloat(difficultySlider.value);
  updateDifficultyDesc(state.difficulty);
  await saveState({ difficulty: state.difficulty });
}

async function handleSiteToggle() {
  if (!currentDomain) return;
  const enabled = siteEnabledCheckbox.checked;
  await browser.runtime.sendMessage({
    type: "TOGGLE_SITE",
    domain: currentDomain,
    enabled,
  });
}

async function saveState(partial: Partial<EliState>) {
  try {
    await browser.runtime.sendMessage({ type: "STATE_UPDATE", state: partial });
  } catch (e) {
    console.error("Failed to save state", e);
  }
}

function openSettings(e: Event) {
  e.preventDefault();
  browser.runtime.openOptionsPage();
}

init();
