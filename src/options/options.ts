import type { EliState, LLMProviderID } from "../shared/types.js";
import { LANGUAGES, PROVIDERS, DEFAULT_STATE } from "../shared/config.js";

let state: EliState = DEFAULT_STATE;

// Elements
const providerButtons = document.querySelectorAll(".provider-btn") as NodeListOf<HTMLButtonElement>;
const apiKeyInput = document.getElementById("api-key") as HTMLInputElement;
const saveKeyButton = document.getElementById("save-key") as HTMLButtonElement;
const keyStatus = document.getElementById("key-status") as HTMLElement;
const apiDocsLink = document.getElementById("api-docs-link") as HTMLAnchorElement;
const modelSelect = document.getElementById("model") as HTMLSelectElement;
const nativeLangSelect = document.getElementById("native-lang") as HTMLSelectElement;
const targetLangSelect = document.getElementById("target-lang") as HTMLSelectElement;

async function init() {
  // Populate language dropdowns
  for (const lang of LANGUAGES) {
    const nativeOption = document.createElement("option");
    nativeOption.value = lang.code;
    nativeOption.textContent = `${lang.flag} ${lang.name}`;
    nativeLangSelect.appendChild(nativeOption);

    const targetOption = document.createElement("option");
    targetOption.value = lang.code;
    targetOption.textContent = `${lang.flag} ${lang.name}`;
    targetLangSelect.appendChild(targetOption);
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

  updateUI();

  // Event listeners
  providerButtons.forEach((btn) => {
    btn.addEventListener("click", () => handleProviderChange(btn.dataset.provider as LLMProviderID));
  });

  saveKeyButton.addEventListener("click", handleSaveKey);
  modelSelect.addEventListener("change", handleModelChange);
  nativeLangSelect.addEventListener("change", handleNativeLangChange);
  targetLangSelect.addEventListener("change", handleTargetLangChange);
}

function updateUI() {
  // Provider buttons
  providerButtons.forEach((btn) => {
    const isActive = btn.dataset.provider === state.provider;
    btn.classList.toggle("active", isActive);
  });

  // API key (show placeholder if exists)
  const currentKey = state.apiKeys[state.provider];
  if (currentKey) {
    apiKeyInput.placeholder = "••••••••" + currentKey.slice(-4);
    apiKeyInput.value = "";
  } else {
    const provider = PROVIDERS.find((p) => p.id === state.provider);
    apiKeyInput.placeholder = provider?.keyPlaceholder || "Enter API key";
  }

  // Update docs link
  const provider = PROVIDERS.find((p) => p.id === state.provider);
  if (provider) {
    apiDocsLink.href = provider.docsUrl;
    apiDocsLink.textContent = new URL(provider.docsUrl).hostname;
  }

  // Model select
  updateModelSelect();

  // Language selects
  nativeLangSelect.value = state.nativeLang;
  targetLangSelect.value = state.targetLang;
}

function updateModelSelect() {
  const provider = PROVIDERS.find((p) => p.id === state.provider);
  if (!provider) return;

  modelSelect.innerHTML = "";
  for (const model of provider.models) {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = model.name;
    modelSelect.appendChild(option);
  }

  modelSelect.value = state.model;
}

function handleProviderChange(providerId: LLMProviderID) {
  // Only Fireworks is enabled for now
  if (providerId !== "fireworks") return;

  state.provider = providerId;
  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (provider && provider.models.length > 0) {
    state.model = provider.models[0].id;
  }

  saveState({ provider: state.provider, model: state.model });
  updateUI();
}

async function handleSaveKey() {
  const key = apiKeyInput.value.trim();
  if (!key) {
    showStatus("Please enter an API key", "error");
    return;
  }

  // Test the key with a simple request
  saveKeyButton.textContent = "Testing...";
  saveKeyButton.disabled = true;

  try {
    const isValid = await testApiKey(key);
    if (isValid) {
      state.apiKeys = { ...state.apiKeys, [state.provider]: key };
      await saveState({ apiKeys: state.apiKeys });
      showStatus("API key saved successfully!", "success");
      apiKeyInput.value = "";
      updateUI();
    } else {
      showStatus("Invalid API key", "error");
    }
  } catch (e) {
    showStatus(`Error: ${e}`, "error");
  } finally {
    saveKeyButton.textContent = "Save";
    saveKeyButton.disabled = false;
  }
}

async function testApiKey(key: string): Promise<boolean> {
  // Simple test request to Fireworks
  try {
    const response = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: state.model,
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function showStatus(message: string, type: "success" | "error") {
  keyStatus.textContent = message;
  keyStatus.className = `status status-${type}`;
  keyStatus.style.display = "block";

  setTimeout(() => {
    keyStatus.style.display = "none";
  }, 5000);
}

async function handleModelChange() {
  state.model = modelSelect.value;
  await saveState({ model: state.model });
}

async function handleNativeLangChange() {
  state.nativeLang = nativeLangSelect.value as EliState["nativeLang"];
  await saveState({ nativeLang: state.nativeLang });
}

async function handleTargetLangChange() {
  state.targetLang = targetLangSelect.value as EliState["targetLang"];
  await saveState({ targetLang: state.targetLang });
}

async function saveState(partial: Partial<EliState>) {
  try {
    await browser.runtime.sendMessage({ type: "STATE_UPDATE", state: partial });
  } catch (e) {
    console.error("Failed to save state", e);
  }
}

init();
