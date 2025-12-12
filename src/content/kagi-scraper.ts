// Scrape and intercept Kagi Translate data

import type {
  CapturedTranslation,
  KagiWordInsightsResponse,
  KagiAlternativeTranslationsResponse,
  KagiTextAlignment,
} from "../types/kagi";

export class KagiScraper {
  private currentTranslation: Partial<CapturedTranslation> = {};
  private capturedInsights: Set<string> = new Set();
  private urlPollingInterval: ReturnType<typeof setInterval> | null = null;
  private domMonitoringInterval: ReturnType<typeof setInterval> | null = null;
  private clickHandler: ((e: Event) => void) | null = null;

  constructor() {
    this.interceptFetch();

    // Extract from URL immediately and periodically (for Firefox timing issues)
    this.extractFromURL();
    this.urlPollingInterval = setInterval(() => this.extractFromURL(), 1000);

    // Also try to extract translation from DOM periodically
    this.startDOMMonitoring();

    // Monitor for word insight clicks
    this.monitorWordInsightClicks();
  }

  private extractFromURL(): void {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    const text = params.get("text");
    const from = params.get("from");
    const to = params.get("to");

    // Only update if we have data and it's different
    if (text && from && to) {
      const needsUpdate =
        text !== this.currentTranslation.sourceText ||
        from !== this.currentTranslation.sourceLang ||
        to !== this.currentTranslation.targetLang;

      if (needsUpdate) {
        this.currentTranslation = {
          sourceText: text,
          sourceLang: from,
          targetLang: to,
          quality: (params.get("quality") as "standard" | "best") || "best",
          timestamp: Date.now(),
        };

      }
    }
  }

  private interceptFetch(): void {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch.apply(window, args);

      // Clone response so we can read it
      const clonedResponse = response.clone();
      const url =
        typeof args[0] === "string" ? args[0] : (args[0] as Request).url;

      // Log all API calls for debugging
      if (url.includes("/api/")) {
      }

      // Handle different API endpoints
      if (url.includes("/api/word-insights")) {
        this.handleWordInsights(clonedResponse);
      } else if (url.includes("/api/alternative-translations")) {
        this.handleAlternativeTranslations(clonedResponse);
      } else if (url.includes("/api/text-alignments")) {
        this.handleTextAlignments(clonedResponse);
      }

      return response;
    };

  }

  private async handleWordInsights(response: Response): Promise<void> {
    try {
      const data: KagiWordInsightsResponse = await response.json();

      if (!this.currentTranslation.insights) {
        this.currentTranslation.insights = [];
      }

      // Add new insights that haven't been captured yet
      data.insights.forEach((insight) => {
        if (!this.capturedInsights.has(insight.id)) {
          this.currentTranslation.insights!.push(insight);
          this.capturedInsights.add(insight.id);
        }
      });

      // Update target text with marked translation
      if (data.marked_translation) {
        // Remove the <<INSIGHT_X>> markers for display
        const cleanText = data.marked_translation
          .replace(/<<INSIGHT_\d+>>/g, "")
          .trim();
        if (
          !this.currentTranslation.targetText ||
          this.currentTranslation.targetText.length < cleanText.length
        ) {
          this.currentTranslation.targetText = cleanText;
        }
      }

    } catch (error) {
    }
  }

  private async handleAlternativeTranslations(
    response: Response
  ): Promise<void> {
    try {
      const data: KagiAlternativeTranslationsResponse = await response.json();

      this.currentTranslation.description = data.original_description;
      this.currentTranslation.alternatives = data.elements;

    } catch (error) {
    }
  }

  private async handleTextAlignments(response: Response): Promise<void> {
    try {
      const data: KagiTextAlignment = await response.json();

      this.currentTranslation.alignments = data;

      // Extract target text from blocks if not already set
      if (!this.currentTranslation.targetText && data.target_blocks) {
        this.currentTranslation.targetText = data.target_blocks.join("");
      }

    } catch (error) {
    }
  }

  public getCurrentTranslation(): Partial<CapturedTranslation> {
    // Before returning, try to scrape alternatives from DOM if not already captured
    if (
      !this.currentTranslation.alternatives ||
      this.currentTranslation.alternatives.length === 0
    ) {
      this.scrapeAlternativesFromDOM();
    }

    // Try to scrape description from DOM if not already captured
    if (!this.currentTranslation.description) {
      this.scrapeDescriptionFromDOM();
    }

    // Try to scrape word insights from DOM
    this.scrapeWordInsightsFromDOM();

    return { ...this.currentTranslation };
  }

  private scrapeWordInsightsFromDOM(): void {
    // Look for all word insight buttons that have data-insight attribute
    const insightButtons = document.querySelectorAll(
      ".word-insight[data-insight]"
    );

    if (insightButtons.length > 0) {
      for (let i = 0; i < insightButtons.length; i++) {
        const button = insightButtons[i];
        const dataInsight = button.getAttribute("data-insight");

        if (dataInsight) {
          try {
            const insight = JSON.parse(decodeURIComponent(dataInsight));

            // Add to captured insights if not already there
            if (!this.capturedInsights.has(insight.id)) {
              if (!this.currentTranslation.insights) {
                this.currentTranslation.insights = [];
              }

              this.currentTranslation.insights.push(insight);
              this.capturedInsights.add(insight.id);
            }
          } catch (error) {
          }
        }
      }

      if (
        this.currentTranslation.insights &&
        this.currentTranslation.insights.length > 0
      ) {
      }
    }
  }

  private scrapeAlternativesFromDOM(): void {
    // Look for alternative translations in the DOM
    const alternativeButtons = document.querySelectorAll(".alternative-button");
    if (alternativeButtons.length > 0) {
      const alternatives: Array<{ translation: string; explanation: string }> =
        [];

      for (let i = 0; i < alternativeButtons.length; i++) {
        const button = alternativeButtons[i];
        const translation = button.getAttribute("data-alternative");
        const ariaLabel = button.getAttribute("aria-label");

        if (translation && ariaLabel) {
          // Extract explanation from aria-label (format: "Translation - Explanation")
          const parts = ariaLabel.split(" - ");
          const explanation =
            parts.length > 1 ? parts.slice(1).join(" - ") : "";

          alternatives.push({
            translation,
            explanation,
          });
        }
      }

      if (alternatives.length > 0) {
        this.currentTranslation.alternatives = alternatives;
      }
    }
  }

  private scrapeDescriptionFromDOM(): void {
    // Look for the description text
    const descriptionEl = document.querySelector(".alternatives-section p");
    if (descriptionEl) {
      const description = descriptionEl.textContent?.trim();
      if (description) {
        this.currentTranslation.description = description;
      }
    }
  }

  public hasCompleteTranslation(): boolean {
    const isComplete = !!(
      this.currentTranslation.sourceText &&
      this.currentTranslation.targetText &&
      this.currentTranslation.sourceLang &&
      this.currentTranslation.targetLang
    );

    if (!isComplete) {
    }

    return isComplete;
  }

  private startDOMMonitoring(): void {
    // Try to extract translation from the DOM as a fallback
    const checkDOM = () => {
      if (!this.currentTranslation.targetText) {

        // Strategy 1: Look for the word-insights-content div (this contains the translation with clickable word insights)
        const wordInsightsContent = document.querySelector(
          ".word-insights-content"
        );
        if (wordInsightsContent) {
          // Find all spans with data-absolute-pos attribute (these contain the translation text pieces)
          const textSpans = wordInsightsContent.querySelectorAll(
            "[data-absolute-pos]"
          );
          let translationText = "";

          for (let i = 0; i < textSpans.length; i++) {
            const span = textSpans[i];
            const text = span.textContent || "";
            translationText += text;
          }

          translationText = translationText.trim();

          if (
            translationText &&
            translationText.length > 0 &&
            translationText !== this.currentTranslation.sourceText
          ) {
            this.currentTranslation.targetText = translationText;
            return;
          }
        }

        // Strategy 2: Look for the user-select-text div (alternative container)
        const userSelectText = document.querySelector(".user-select-text");
        if (userSelectText) {
          const text = (userSelectText.textContent || "").trim();
          if (
            text &&
            text.length > 0 &&
            text !== this.currentTranslation.sourceText
          ) {
            this.currentTranslation.targetText = text;
            return;
          }
        }

        // Strategy 3: Look for translation-content div (basic translation without word insights)
        const translationContent = document.querySelector(
          ".translation-content"
        );
        if (translationContent) {
          const text = (translationContent.textContent || "").trim();
          if (
            text &&
            text.length > 0 &&
            text !== this.currentTranslation.sourceText
          ) {
            this.currentTranslation.targetText = text;
            return;
          }
        }

      }
    };

    // Check every 500ms
    this.domMonitoringInterval = setInterval(checkDOM, 500);

    // Also check after delays to give page time to load
    setTimeout(checkDOM, 500);
    setTimeout(checkDOM, 1000);
    setTimeout(checkDOM, 2000);
  }

  private monitorWordInsightClicks(): void {
    // Listen for clicks on word insight buttons
    this.clickHandler = (e: Event) => {
      const target = e.target as HTMLElement;
      const insightButton = target.closest(".word-insight");

      if (insightButton) {
        // Extract insight data from the data-insight attribute
        const dataInsight = insightButton.getAttribute("data-insight");
        if (dataInsight) {
          try {
            const insight = JSON.parse(decodeURIComponent(dataInsight));

            // Add to captured insights if not already there
            if (!this.capturedInsights.has(insight.id)) {
              if (!this.currentTranslation.insights) {
                this.currentTranslation.insights = [];
              }

              this.currentTranslation.insights.push(insight);
              this.capturedInsights.add(insight.id);

            }
          } catch (error) {
          }
        }
      }
    };
    document.addEventListener("click", this.clickHandler);
  }

  public reset(): void {
    this.currentTranslation = {
      timestamp: Date.now(),
    };
    this.capturedInsights.clear();
  }

  public destroy(): void {
    if (this.urlPollingInterval) {
      clearInterval(this.urlPollingInterval);
      this.urlPollingInterval = null;
    }
    if (this.domMonitoringInterval) {
      clearInterval(this.domMonitoringInterval);
      this.domMonitoringInterval = null;
    }
    if (this.clickHandler) {
      document.removeEventListener("click", this.clickHandler);
      this.clickHandler = null;
    }
    this.currentTranslation = {};
    this.capturedInsights.clear();
  }
}
