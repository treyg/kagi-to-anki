// Background service worker

import { addNote, createModel, testConnection, getDeckNames } from "./anki-api";
import { formatCardFront, formatCardBack } from "../utils/card-formatter";
import { getSettings, incrementCardCount } from "../utils/storage";
import type { CapturedTranslation } from "../types/kagi";
import type { AnkiNote } from "../types/anki";

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {

  // Try to create the custom Anki model
  try {
    const connected = await testConnection();
    if (connected) {
      await createModel();
    } else {
    }
  } catch (error) {
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SAVE_TO_ANKI") {
    handleSaveToAnki(message.data as CapturedTranslation)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === "TEST_ANKI_CONNECTION") {
    testConnection()
      .then((connected) => sendResponse({ connected }))
      .catch(() => sendResponse({ connected: false }));
    return true;
  }

  if (message.type === "CREATE_ANKI_MODEL") {
    createModel()
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === "GET_DECKS") {
    getDeckNames()
      .then((decks) => sendResponse({ success: true, decks }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function handleSaveToAnki(
  translation: CapturedTranslation
): Promise<{ noteId: number; cardCount: number }> {
  // Ensure the Anki model exists (create if missing)
  try {
    await createModel();
  } catch (error) {
  }

  // Get settings
  const settings = await getSettings();

  // Format card content
  const front = formatCardFront(translation);
  const back = formatCardBack(translation);

  // Prepare tags
  const tags = [
    ...settings.customTags,
    `${translation.sourceLang}-${translation.targetLang}`,
    translation.quality,
  ];

  // Build Anki note
  const note: AnkiNote = {
    deckName: settings.ankiDeck,
    modelName: "Kagi Translation",
    fields: {
      Front: front,
      Back: back,
      Audio: "", // Will be populated by audio field below
      SourceLang: translation.sourceLang,
      TargetLang: translation.targetLang,
      Quality: translation.quality,
    },
    tags,
    options: {
      allowDuplicate: false,
      duplicateScope: "deck",
    },
  };

  // Add audio if available
  if (translation.audioData && translation.audioFilename) {

    note.audio = [
      {
        data: translation.audioData,
        filename: translation.audioFilename,
        fields: ["Audio"],
      },
    ];
  } else {
  }


  // Add note to Anki
  const noteId = await addNote(note);

  // Increment card count
  const cardCount = await incrementCardCount();


  return { noteId, cardCount };
}
