// Main content script

import { KagiScraper } from './kagi-scraper';
import { UIInjector } from './ui-injector';
import { fetchAudioAsBase64, generateAudioFilename } from '../utils/audio-handler';
import { getSettings } from '../utils/storage';
import type { CapturedTranslation } from '../types/kagi';


const scraper = new KagiScraper();
const ui = new UIInjector();

// Monitor for translation completion
let checkInterval = setInterval(() => {
  if (scraper.hasCompleteTranslation()) {
    ui.showButton();
  }
}, 500);

// Handle save button click
ui.onSave(async () => {
  ui.setLoading(true);
  
  try {
    const translation = scraper.getCurrentTranslation();
    
    if (!scraper.hasCompleteTranslation()) {
      throw new Error('Translation data is incomplete');
    }
    
    // Fetch audio if enabled in settings
    const settings = await getSettings();
    
    if (settings.includeAudio) {
      // Detect currently selected voice from Kagi UI
      const selectedVoiceBtn = document.querySelector('button[role="option"][aria-selected="true"]');
      let voice = 'sage'; // default fallback
      
      if (selectedVoiceBtn) {
        const voiceText = selectedVoiceBtn.textContent || '';
        const voiceMatch = voiceText.match(/^(Alloy|Ash|Ballad|Coral|Echo|Fable|Onyx|Nova|Sage|Shimmer|Verse)/i);
        if (voiceMatch) {
          voice = voiceMatch[1].toLowerCase();
        }
      }
      
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
  } catch (error) {
    ui.showToast(`Failed to save: ${error}`, 'error');
  } finally {
    ui.setLoading(false);
  }
});

// Monitor URL changes (for SPA navigation)
let lastURL = window.location.href;
setInterval(() => {
  const currentURL = window.location.href;
  if (currentURL !== lastURL) {
    lastURL = currentURL;
    scraper.reset();
    ui.hideButton();
  }
}, 500);

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  clearInterval(checkInterval);
});
