import type { EliState } from "../shared/types.js";
import { DEFAULT_STATE } from "../shared/config.js";

const STORAGE_KEY = "eli-state";

let cachedState: EliState | null = null;

export async function getState(): Promise<EliState> {
  if (cachedState) return cachedState;

  const result = await browser.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as Partial<EliState> | undefined;

  // Deep merge apiKeys and siteEnabled
  cachedState = {
    ...DEFAULT_STATE,
    ...stored,
    apiKeys: { ...DEFAULT_STATE.apiKeys, ...stored?.apiKeys },
    siteEnabled: { ...DEFAULT_STATE.siteEnabled, ...stored?.siteEnabled },
  };
  return cachedState;
}

export async function setState(partial: Partial<EliState>): Promise<EliState> {
  const current = await getState();
  const updated = { ...current, ...partial };
  await browser.storage.local.set({ [STORAGE_KEY]: updated });
  cachedState = updated;

  // Notify all tabs of state change
  broadcastStateUpdate(updated);

  return updated;
}

export async function toggleSite(domain: string, enabled: boolean): Promise<EliState> {
  const current = await getState();
  const siteEnabled = { ...current.siteEnabled, [domain]: enabled };
  return setState({ siteEnabled });
}

function broadcastStateUpdate(state: EliState) {
  browser.tabs.query({}).then((tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        browser.tabs.sendMessage(tab.id, { type: "STATE_UPDATE", state }).catch(() => {
          // Tab might not have content script loaded, ignore
        });
      }
    }
  });
}
