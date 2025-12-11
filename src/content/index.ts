// Main content script

import { KagiScraper } from './kagi-scraper';
import { DictionaryScraper } from './dictionary-scraper';
import { UIInjector } from './ui-injector';
import { fetchAudioAsBase64, generateAudioFilename } from '../utils/audio-handler';
import { getSettings } from '../utils/storage';
import type { CapturedTranslation, CapturedDictionaryEntry } from '../types/kagi';

// Detect page type based on URL path
function getPageType(): 'translate' | 'dictionary' {
  const pathname = window.location.pathname;
  if (pathname.startsWith('/dictionary')) {
    return 'dictionary';
  }
  return 'translate';
}

// Detect selected voice from Kagi UI
function detectSelectedVoice(): string {
  const selectedVoiceBtn = document.querySelector('button[role="option"][aria-selected="true"]');
  if (selectedVoiceBtn) {
    const voiceText = selectedVoiceBtn.textContent || '';
    const voiceMatch = voiceText.match(/^(Alloy|Ash|Ballad|Coral|Echo|Fable|Onyx|Nova|Sage|Shimmer|Verse)/i);
    if (voiceMatch) {
      return voiceMatch[1].toLowerCase();
    }
  }
  return 'sage'; // default fallback
}

// Initialize scrapers based on page type
const pageType = getPageType();
const translationScraper = pageType === 'translate' ? new KagiScraper() : null;
const dictionaryScraper = pageType === 'dictionary' ? new DictionaryScraper() : null;
const ui = new UIInjector(pageType);

// Monitor for completion based on page type
let checkInterval = setInterval(() => {
  if (pageType === 'dictionary') {
    if (dictionaryScraper?.hasCompleteEntry()) {
      ui.showButton();
    }
  } else {
    if (translationScraper?.hasCompleteTranslation()) {
      ui.showButton();
    }
  }
}, 500);

// Handle save button click
ui.onSave(async () => {
  ui.setLoading(true);

  try {
    const settings = await getSettings();

    if (pageType === 'dictionary') {
      // Handle dictionary save
      await handleDictionarySave(settings);
    } else {
      // Handle translation save
      await handleTranslationSave(settings);
    }
  } catch (error) {
    ui.showToast(`Failed to save: ${error}`, 'error');
  } finally {
    ui.setLoading(false);
  }
});

async function handleTranslationSave(settings: Awaited<ReturnType<typeof getSettings>>) {
  if (!translationScraper) {
    throw new Error('Translation scraper not available. Please refresh the page.');
  }

  const translation = translationScraper.getCurrentTranslation();

  if (!translationScraper.hasCompleteTranslation()) {
    throw new Error('Translation data is incomplete');
  }

  // Fetch audio if enabled in settings
  if (settings.includeAudio) {
    const voice = detectSelectedVoice();

    const audioResult = await fetchAudioAsBase64(
      translation.targetText!,
      translation.targetLang!,
      voice
    );

    if (audioResult) {
      translation.audioData = audioResult.data;
      translation.audioFilename = generateAudioFilename(
        translation.sourceLang!,
        translation.targetLang!,
        audioResult.mimeType
      );
    }
  }

  // Send to background script to save to Anki
  const response = await chrome.runtime.sendMessage({
    type: 'SAVE_TO_ANKI',
    data: translation as CapturedTranslation,
  });

  if (response.success) {
    // Build success message with details
    const parts = ['Saved to Anki!'];
    const insightCount = translation.insights?.length || 0;
    const altCount = translation.alternatives?.length || 0;

    const details = [];
    if (insightCount > 0) details.push(`${insightCount} word insight${insightCount > 1 ? 's' : ''}`);
    if (altCount > 0) details.push(`${altCount} alternative${altCount > 1 ? 's' : ''}`);

    if (details.length > 0) {
      parts.push(details.join(', '));
    }

    ui.showToast(parts.join(' • '), 'success');
  } else {
    throw new Error(response.error || 'Unknown error');
  }
}

async function handleDictionarySave(settings: Awaited<ReturnType<typeof getSettings>>) {
  if (!dictionaryScraper) {
    throw new Error('Dictionary scraper not available. Please refresh the page.');
  }

  const entry = dictionaryScraper.getCurrentEntry();

  if (!dictionaryScraper.hasCompleteEntry()) {
    throw new Error('Dictionary entry is incomplete');
  }

  // Fetch audio if enabled in settings
  if (settings.includeAudio && entry.word && entry.language) {
    const voice = detectSelectedVoice();

    const audioResult = await fetchAudioAsBase64(
      entry.word,
      entry.language,
      voice
    );

    if (audioResult) {
      entry.audioData = audioResult.data;
      entry.audioFilename = generateAudioFilename(
        entry.language,
        entry.language,
        audioResult.mimeType
      );
    }
  }

  // Send to background script to save to Anki
  const response = await chrome.runtime.sendMessage({
    type: 'SAVE_DICTIONARY_TO_ANKI',
    data: entry as CapturedDictionaryEntry,
  });

  if (response.success) {
    const defCount = entry.definitions?.length || 0;
    const synCount = entry.synonyms?.length || 0;

    const details = [];
    if (defCount > 0) details.push(`${defCount} definition${defCount > 1 ? 's' : ''}`);
    if (synCount > 0) details.push(`${synCount} synonym${synCount > 1 ? 's' : ''}`);

    const message = details.length > 0
      ? `Saved to Anki! • ${details.join(', ')}`
      : 'Saved to Anki!';

    ui.showToast(message, 'success');
  } else {
    throw new Error(response.error || 'Unknown error');
  }
}

// Monitor URL changes (for SPA navigation)
let lastURL = window.location.href;
setInterval(() => {
  const currentURL = window.location.href;
  if (currentURL !== lastURL) {
    lastURL = currentURL;

    // Reset appropriate scraper
    if (pageType === 'dictionary') {
      dictionaryScraper?.reset();
    } else {
      translationScraper?.reset();
    }

    ui.hideButton();
  }
}, 500);

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  clearInterval(checkInterval);
});
