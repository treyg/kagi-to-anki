// Options page script

import { getSettings, saveSettings } from "../utils/storage";

const deckSelect = document.getElementById("anki-deck") as HTMLSelectElement;
const customTagsInput = document.getElementById(
  "custom-tags"
) as HTMLInputElement;
const includeAudioCheckbox = document.getElementById(
  "include-audio"
) as HTMLInputElement;
const refreshDecksBtn = document.getElementById(
  "refresh-decks"
) as HTMLButtonElement;
const createModelBtn = document.getElementById(
  "create-model"
) as HTMLButtonElement | null;
const saveSettingsBtn = document.getElementById(
  "save-settings"
) as HTMLButtonElement;
const statusMessage = document.getElementById(
  "status-message"
) as HTMLDivElement;

// Load current settings
async function loadSettings() {
  const settings = await getSettings();

  customTagsInput.value = settings.customTags.join(", ");
  includeAudioCheckbox.checked = settings.includeAudio;

  // Load Anki decks
  await loadAnkiDecks(settings.ankiDeck);
}

// Load Anki decks
async function loadAnkiDecks(selectedDeck?: string) {
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_DECKS" });

    if (!response.success) {
      throw new Error(response.error || "Failed to get decks");
    }

    const decks = response.decks as string[];

    deckSelect.innerHTML = "";
    decks.forEach((deck) => {
      const option = document.createElement("option");
      option.value = deck;
      option.textContent = deck;
      if (deck === selectedDeck) {
        option.selected = true;
      }
      deckSelect.appendChild(option);
    });

    if (decks.length === 0) {
      const option = document.createElement("option");
      option.textContent = "No decks found (is Anki running?)";
      deckSelect.appendChild(option);
    }
  } catch (error) {
    deckSelect.innerHTML = "<option>Error loading decks</option>";
    showStatus(
      "Failed to connect to Anki. Make sure Anki is running with AnkiConnect installed.",
      "error"
    );
  }
}

// Save settings
async function handleSaveSettings() {
  try {
    const tags = customTagsInput.value
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    await saveSettings({
      ankiDeck: deckSelect.value,
      customTags: tags,
      includeAudio: includeAudioCheckbox.checked,
    });

    showStatus("Settings saved successfully!", "success");
  } catch (error) {
    showStatus(`Failed to save settings: ${error}`, "error");
  }
}

// Create Anki model
async function handleCreateModel() {
  if (!createModelBtn) return;
  
  createModelBtn.disabled = true;
  createModelBtn.textContent = "⏳ Creating...";

  try {
    const response = await chrome.runtime.sendMessage({
      type: "CREATE_ANKI_MODEL",
    });

    if (response.success) {
      showStatus(
        'Anki model "Kagi Translation" created successfully!',
        "success"
      );
    } else {
      throw new Error(response.error || "Failed to create model");
    }
  } catch (error) {
    showStatus(`Error: ${error}`, "error");
  } finally {
    createModelBtn.disabled = false;
    createModelBtn.textContent = "Create Anki Model";
  }
}

// Show status message
function showStatus(message: string, type: "success" | "error") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type} show`;

  setTimeout(() => {
    statusMessage.classList.remove("show");
  }, 3000);
}

// Event listeners
refreshDecksBtn.addEventListener("click", () => loadAnkiDecks());
if (createModelBtn) {
  createModelBtn.addEventListener("click", handleCreateModel);
}
saveSettingsBtn.addEventListener("click", handleSaveSettings);

// Initialize
loadSettings();
