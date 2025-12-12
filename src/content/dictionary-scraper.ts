// Scrape and intercept Kagi Dictionary data

import type {
  CapturedDictionaryEntry,
  DictionaryDefinition,
  DictionarySynonym,
  DictionaryExample,
} from "../types/kagi";

export class DictionaryScraper {
  private currentEntry: Partial<CapturedDictionaryEntry> = {};
  private observer: MutationObserver | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.interceptFetch();

    // Extract from URL and Svelte script tag immediately
    this.extractFromURL();
    this.extractFromSvelteData();

    // Use MutationObserver to detect when Svelte hydrates the content
    this.startMutationObserver();

    // Single unified polling loop for URL and DOM scraping
    this.startPolling();
  }

  private startPolling(): void {
    // Consolidate all periodic checks into one interval
    this.pollingInterval = setInterval(() => {
      this.extractFromURL();

      if (!this.currentEntry.definitions?.length) {
        this.scrapeDefinitionsFromDOM();
      }
    }, 500);
  }

  private extractFromURL(): void {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    // Try different param names that Kagi might use
    const word = params.get("word") || params.get("text") || params.get("q");
    const lang = params.get("lang") || params.get("language") || params.get("from");

    // Only update if we have data and it's different
    if (word) {
      const needsUpdate =
        word !== this.currentEntry.word ||
        (lang && lang !== this.currentEntry.language);

      if (needsUpdate) {
        this.currentEntry = {
          word,
          language: lang || "auto",
          timestamp: Date.now(),
        };
      }
    }
  }

  private extractFromSvelteData(): void {
    // Kagi uses Svelte with data embedded in a script tag
    // Look for script tags containing data object
    const scripts = document.querySelectorAll('script');
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      const content = script.textContent || '';

      // Look for patterns like: data: { language: "auto", word: "..." }
      // or __data = { ... }
      const patterns = [
        /data:\s*\{\s*language:\s*["']([^"']+)["'],\s*word:\s*["']([^"']+)["']/,
        /data:\s*\{\s*word:\s*["']([^"']+)["'],\s*language:\s*["']([^"']+)["']/,
        /"word":\s*["']([^"']+)["'].*?"language":\s*["']([^"']+)["']/,
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          // Different patterns have different group orders
          let word: string, lang: string;
          if (pattern.source.indexOf('language') < pattern.source.indexOf('word')) {
            lang = match[1];
            word = match[2];
          } else {
            word = match[1];
            lang = match[2];
          }

          if (word && !this.currentEntry.word) {
            this.currentEntry.word = word;
            this.currentEntry.language = lang || "auto";
            this.currentEntry.timestamp = Date.now();
            return;
          }
        }
      }
    }
  }

  private startMutationObserver(): void {
    // Watch for DOM changes when Svelte hydrates content
    this.observer = new MutationObserver((mutations) => {
      let shouldScrape = false;

      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldScrape = true;
          break;
        }
      }

      if (shouldScrape && !this.currentEntry.definitions?.length) {
        // Debounce scraping
        setTimeout(() => this.scrapeDefinitionsFromDOM(), 100);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private interceptFetch(): void {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch.apply(window, args);

      // Wrap interception in try-catch to ensure original fetch behavior is not affected
      try {
        const clonedResponse = response.clone();
        const url =
          typeof args[0] === "string" ? args[0] : (args[0] as Request).url;

        // Handle dictionary-specific API endpoints
        if (url.includes("/api/dictionary")) {
          this.handleDictionaryResponse(clonedResponse);
        }
      } catch (interceptError) {
        console.warn('[KagiToAnki] Error in fetch interception (non-fatal):', interceptError);
      }

      return response;
    };
  }

  private async handleDictionaryResponse(response: Response): Promise<void> {
    try {
      const data = await response.json();

      // Parse dictionary response - structure may vary, handle flexibly
      if (data.definitions) {
        this.currentEntry.definitions = data.definitions;
      }
      if (data.synonyms) {
        this.currentEntry.synonyms = data.synonyms;
      }
      if (data.examples) {
        this.currentEntry.examples = data.examples;
      }
      if (data.pronunciation) {
        this.currentEntry.pronunciation = data.pronunciation;
      }
      if (data.etymology) {
        this.currentEntry.etymology = data.etymology;
      }
    } catch (error) {
      // API parsing failed - DOM scraping will be used as fallback
      console.warn('[KagiToAnki] Failed to parse dictionary API response, will use DOM scraping:', error);
    }
  }

  public getCurrentEntry(): Partial<CapturedDictionaryEntry> {
    // Before returning, try to scrape from DOM if not already captured
    if (!this.currentEntry.definitions || this.currentEntry.definitions.length === 0) {
      this.scrapeDefinitionsFromDOM();
    }

    if (!this.currentEntry.synonyms || this.currentEntry.synonyms.length === 0) {
      this.scrapeSynonymsFromDOM();
    }

    if (!this.currentEntry.examples || this.currentEntry.examples.length === 0) {
      this.scrapeExamplesFromDOM();
    }

    if (!this.currentEntry.pronunciation) {
      this.scrapePronunciationFromDOM();
    }

    if (!this.currentEntry.etymology) {
      this.scrapeEtymologyFromDOM();
    }

    if (!this.currentEntry.notes) {
      this.scrapeNotesFromDOM();
    }

    if (!this.currentEntry.relatedWords || this.currentEntry.relatedWords.length === 0) {
      this.scrapeRelatedWordsFromDOM();
    }

    return { ...this.currentEntry };
  }

  private scrapeDefinitionsFromDOM(): void {
    const definitions: DictionaryDefinition[] = [];

    // Primary meaning - uses #primary-meaning container
    const primaryDiv = document.getElementById('primary-meaning');
    if (primaryDiv) {
      // Get part of speech from the header area (look for noun, verb, etc.)
      const posEl = primaryDiv.querySelector('span[class*="bg-"]');
      const partOfSpeech = posEl?.textContent?.trim() || '';

      // Get definition text - only the main p tag, not nested ones
      const defParagraphs = primaryDiv.querySelectorAll(':scope > div > div p');
      for (let i = 0; i < defParagraphs.length; i++) {
        const defText = defParagraphs[i].textContent?.trim();
        if (defText && defText.length > 10 && !definitions.some(d => d.definition === defText)) {
          definitions.push({
            partOfSpeech: i === 0 ? partOfSpeech : '',
            definition: defText,
          });
        }
      }
    }

    // Other meanings - uses #other-meanings container
    const otherDiv = document.getElementById('other-meanings');
    if (otherDiv) {
      const defParagraphs = otherDiv.querySelectorAll('p');
      for (let i = 0; i < defParagraphs.length; i++) {
        const defText = defParagraphs[i].textContent?.trim();
        if (defText && defText.length > 10 && !definitions.some(d => d.definition === defText)) {
          definitions.push({
            partOfSpeech: '',
            definition: defText,
          });
        }
      }
    }

    if (definitions.length > 0) {
      this.currentEntry.definitions = definitions;
    }
  }

  private scrapeSynonymsFromDOM(): void {
    const synonyms: DictionarySynonym[] = [];

    // Get synonyms from both primary and other meanings sections
    // Synonyms are button elements within the meaning containers
    const synonymButtons = document.querySelectorAll(
      '#primary-meaning button, #other-meanings button'
    );

    for (let i = 0; i < synonymButtons.length; i++) {
      const word = synonymButtons[i].textContent?.trim();
      if (word && word.length > 0 && word.length < 50) {
        // Avoid duplicates
        if (!synonyms.some(s => s.word === word)) {
          synonyms.push({ word });
        }
      }
    }

    if (synonyms.length > 0) {
      this.currentEntry.synonyms = synonyms;
    }
  }

  private scrapeExamplesFromDOM(): void {
    const examples: DictionaryExample[] = [];

    // Examples are in #examples container with structured list items
    const examplesDiv = document.getElementById('examples');
    if (examplesDiv) {
      // Get example rows from the nested flex container
      const rows = examplesDiv.querySelectorAll('.flex.flex-col.gap-6 > div');

      for (let i = 0; i < rows.length; i++) {
        const text = rows[i].querySelector('p')?.textContent?.trim();
        if (text && text.length > 5) {
          examples.push({ sentence: text });
        }
      }
    }

    // Fallback: Look for example sentence containers
    if (examples.length === 0) {
      const exampleContainers = document.querySelectorAll(
        '[class*="example"], [class*="usage"], [class*="sentence"], blockquote'
      );

      for (let i = 0; i < exampleContainers.length; i++) {
        const sentence = exampleContainers[i].textContent?.trim();
        if (sentence && sentence.length > 5) {
          examples.push({ sentence });
        }
      }
    }

    if (examples.length > 0) {
      this.currentEntry.examples = examples;
    }
  }

  private scrapePronunciationFromDOM(): void {
    // Kagi uses .pronunciation-pill > span for pronunciation
    const pronEl = document.querySelector('.pronunciation-pill > span');
    if (pronEl) {
      const pron = pronEl.textContent?.trim();
      if (pron && pron.length > 0) {
        this.currentEntry.pronunciation = pron;
        return;
      }
    }

    // Fallback: Look for IPA or pronunciation elements
    const pronElements = document.querySelectorAll(
      '[class*="pronunciation"], [class*="phonetic"], [class*="ipa"], .pron'
    );

    for (let i = 0; i < pronElements.length; i++) {
      const el = pronElements[i];
      const pron = el.textContent?.trim();
      if (pron && pron.length > 0) {
        this.currentEntry.pronunciation = pron;
        break;
      }
    }
  }

  private scrapeEtymologyFromDOM(): void {
    // Etymology is in #etymology container
    const etymologyDiv = document.getElementById('etymology');
    if (etymologyDiv) {
      const text = etymologyDiv.querySelector('p')?.textContent?.trim();
      if (text && text.length > 0) {
        this.currentEntry.etymology = text;
      }
    }
  }

  private scrapeNotesFromDOM(): void {
    // Notes section - look for #notes container or similar
    const notesDiv = document.getElementById('notes');
    if (notesDiv) {
      const paragraphs = notesDiv.querySelectorAll('p');
      const noteTexts: string[] = [];
      for (let i = 0; i < paragraphs.length; i++) {
        const text = paragraphs[i].textContent?.trim();
        if (text && text.length > 0) {
          noteTexts.push(text);
        }
      }
      if (noteTexts.length > 0) {
        this.currentEntry.notes = noteTexts.join('\n');
      }
    }
  }

  private scrapeRelatedWordsFromDOM(): void {
    const relatedWords: string[] = [];

    // Look for related-words container
    const relatedDiv = document.getElementById('related-words');
    if (relatedDiv) {
      const buttons = relatedDiv.querySelectorAll('button');
      for (let i = 0; i < buttons.length; i++) {
        const word = buttons[i].textContent?.trim();
        if (word && word.length > 0 && word.length < 50) {
          if (!relatedWords.includes(word)) {
            relatedWords.push(word);
          }
        }
      }
    }

    if (relatedWords.length > 0) {
      this.currentEntry.relatedWords = relatedWords;
    }
  }

  public hasCompleteEntry(): boolean {
    // For dictionary, we only require word + language to show the button
    // Definitions are scraped from client-side rendered content and may not be available immediately
    // The card will be created with whatever data we have at save time
    const hasBasics = !!(
      this.currentEntry.word &&
      this.currentEntry.language
    );

    // Still try to scrape definitions in the background
    if (hasBasics && (!this.currentEntry.definitions || this.currentEntry.definitions.length === 0)) {
      this.scrapeDefinitionsFromDOM();
    }

    return hasBasics;
  }

  public reset(): void {
    this.currentEntry = {
      timestamp: Date.now(),
    };
  }

  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.currentEntry = {};
  }
}
