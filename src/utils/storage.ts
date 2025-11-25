// Chrome storage helpers

export interface ExtensionSettings {
  ankiDeck: string;
  autoSave: boolean;
  customTags: string[];
  defaultQuality: "standard" | "best";
  includeAudio: boolean;
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  ankiDeck: "Default",
  autoSave: false,
  customTags: ["kagi-translate"],
  defaultQuality: "best",
  includeAudio: true,
};

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.sync.get("settings");
  return { ...DEFAULT_SETTINGS, ...result.settings };
}

export async function saveSettings(
  settings: Partial<ExtensionSettings>
): Promise<void> {
  const current = await getSettings();
  await chrome.storage.sync.set({ settings: { ...current, ...settings } });
}

export async function incrementCardCount(): Promise<number> {
  const result = await chrome.storage.local.get("cardCount");
  const count = (result.cardCount || 0) + 1;
  await chrome.storage.local.set({ cardCount: count });
  return count;
}

export async function getCardCount(): Promise<number> {
  const result = await chrome.storage.local.get("cardCount");
  return result.cardCount || 0;
}
