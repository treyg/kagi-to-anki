// Background service worker

import { addNote, createModel, testConnection, getDeckNames } from "./anki-api";
import { formatCardFront, formatCardBack, formatDictionaryFront, formatDictionaryBack } from "../utils/card-formatter";
import { getSettings, incrementCardCount } from "../utils/storage";
import type { CapturedTranslation, CapturedDictionaryEntry } from "../types/kagi";
import type { AnkiNote } from "../types/anki";

// Shared note data interface for both translation and dictionary saves
interface NoteData {
  front: string;
  back: string;
  tags: string[];
  sourceLang: string;
  targetLang: string;
  quality: string;
  audioData?: string;
  audioFilename?: string;
}

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  // Try to create the custom Anki model
  try {
    const connected = await testConnection();
    if (connected) {
      await createModel();
      console.log('[KagiToAnki] Extension installed, Anki model created successfully');
    } else {
      console.log('[KagiToAnki] Extension installed, but Anki is not running. Please start Anki with AnkiConnect.');
    }
  } catch (error) {
    console.error('[KagiToAnki] Extension installation error:', error);
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

  if (message.type === "SAVE_DICTIONARY_TO_ANKI") {
    handleSaveDictionaryToAnki(message.data as CapturedDictionaryEntry)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Shared helper for saving notes to Anki
async function saveNoteToAnki(data: NoteData): Promise<{ noteId: number; cardCount: number }> {
  // Ensure the Anki model exists (create if missing)
  try {
    await createModel();
  } catch (error) {
    console.warn('[KagiToAnki] Model creation warning (may already exist):', error);
  }

  const settings = await getSettings();

  const note: AnkiNote = {
    deckName: settings.ankiDeck,
    modelName: "Kagi Translation",
    fields: {
      Front: data.front,
      Back: data.back,
      Audio: "",
      SourceLang: data.sourceLang,
      TargetLang: data.targetLang,
      Quality: data.quality,
    },
    tags: [...settings.customTags, ...data.tags],
    options: {
      allowDuplicate: false,
      duplicateScope: "deck",
    },
  };

  if (data.audioData && data.audioFilename) {
    note.audio = [
      {
        data: data.audioData,
        filename: data.audioFilename,
        fields: ["Audio"],
      },
    ];
  }

  const noteId = await addNote(note);
  const cardCount = await incrementCardCount();

  return { noteId, cardCount };
}

async function handleSaveToAnki(
  translation: CapturedTranslation
): Promise<{ noteId: number; cardCount: number }> {
  return saveNoteToAnki({
    front: formatCardFront(translation),
    back: formatCardBack(translation),
    tags: [`${translation.sourceLang}-${translation.targetLang}`, translation.quality],
    sourceLang: translation.sourceLang,
    targetLang: translation.targetLang,
    quality: translation.quality,
    audioData: translation.audioData,
    audioFilename: translation.audioFilename,
  });
}

async function handleSaveDictionaryToAnki(
  entry: CapturedDictionaryEntry
): Promise<{ noteId: number; cardCount: number }> {
  return saveNoteToAnki({
    front: formatDictionaryFront(entry),
    back: formatDictionaryBack(entry),
    tags: [entry.language, "dictionary"],
    sourceLang: entry.language,
    targetLang: entry.language,
    quality: "dictionary",
    audioData: entry.audioData,
    audioFilename: entry.audioFilename,
  });
}
