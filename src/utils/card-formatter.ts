// Format flashcard HTML from captured translation data

import type { CapturedTranslation, CapturedDictionaryEntry } from "../types/kagi";

export function formatCardFront(translation: CapturedTranslation): string {
  return translation.sourceText;
}

export function formatCardBack(translation: CapturedTranslation): string {

  const parts: string[] = [];

  // Main translation
  parts.push(`
    <div class="kagi-flashcard">
      <div class="main-translation">
        <span class="translation-text">${escapeHtml(
          translation.targetText
        )}</span>
      </div>
  `);

  // Translation insight/description
  if (translation.description) {
    parts.push(`
      <div class="insight-box">
        <div class="insight-text">${escapeHtml(translation.description)}</div>
      </div>
    `);
  }

  // Word insights - show BEFORE alternatives
  if (translation.insights && translation.insights.length > 0) {
    parts.push(`
      <div class="word-insights">
        <h4>Word Details</h4>
    `);

    translation.insights.forEach((insight) => {
      parts.push(`
        <div class="word-insight">
          <div class="word-header">
            <strong>${escapeHtml(insight.original_text)}</strong>
            <span class="word-type">(${escapeHtml(insight.type)})</span>
          </div>
          <ul class="variations">
      `);

      insight.variations.forEach((variation) => {
        parts.push(`
          <li><strong>${escapeHtml(variation.text)}</strong> - ${escapeHtml(
          variation.explanation
        )}</li>
        `);
      });

      parts.push(`
          </ul>
        </div>
      `);
    });

    parts.push(`
      </div>
    `);
  }

  // Alternative translations - show AFTER word insights
  if (translation.alternatives && translation.alternatives.length > 0) {
    parts.push(`
      <div class="alternatives">
        <h4>Alternative Translations</h4>
        <ul>
    `);

    translation.alternatives.forEach((alt) => {
      parts.push(`
        <li>
          <strong>${escapeHtml(alt.translation)}</strong><br>
          <span class="explanation">${escapeHtml(alt.explanation)}</span>
        </li>
      `);
    });

    parts.push(`
        </ul>
      </div>
    `);
  }

  // Metadata footer
  const date = new Date(translation.timestamp).toLocaleDateString();
  parts.push(`
      <div class="metadata">
        <small>${translation.sourceLang} → ${translation.targetLang} | Quality: ${translation.quality} | ${date}</small>
      </div>
    </div>
  `);

  // Add embedded CSS
  parts.unshift(getCardCSS());

  return parts.join("\n");
}

function getCardCSS(): string {
  return `
<style>
.kagi-flashcard {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  padding: 20px;
}

.main-translation {
  font-size: 1.5em;
  font-weight: bold;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.audio-inline {
  font-size: 0.6em;
  opacity: 0.8;
}

.insight-box {
  background: rgba(83, 82, 255, 0.05);
  border-left: 4px solid #5352FF;
  padding: 15px;
  margin: 15px 0;
  border-radius: 4px;
}

.insight-text {
  opacity: 0.8;
}

.alternatives {
  margin: 20px 0;
}

.alternatives h4 {
  margin-bottom: 10px;
  font-size: 1.1em;
  font-weight: 600;
}

.alternatives ul {
  list-style: none;
  padding: 0;
}

.alternatives li {
  background: rgba(83, 82, 255, 0.05);
  border-left: 2px solid rgba(83, 82, 255, 0.3);
  padding: 12px;
  margin: 8px 0;
  border-radius: 4px;
}

.alternatives strong {
  font-size: 1.1em;
}

.explanation {
  opacity: 0.7;
  font-size: 0.95em;
  display: block;
  margin-top: 4px;
}

.word-insights {
  margin: 20px 0;
}

.word-insights h4 {
  margin-bottom: 10px;
  font-size: 1.1em;
  font-weight: 600;
}

.word-insight {
  background: rgba(66, 186, 153, 0.05);
  border-left: 2px solid rgba(66, 186, 153, 0.3);
  padding: 15px;
  margin: 10px 0;
  border-radius: 4px;
}

.word-header {
  margin-bottom: 10px;
}

.word-type {
  opacity: 0.6;
  font-size: 0.9em;
  font-weight: normal;
  margin-left: 8px;
}

.variations {
  list-style: none;
  padding-left: 15px;
}

.variations li {
  margin: 6px 0;
}

.variations strong {
  font-weight: 600;
}

.metadata {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  opacity: 0.6;
  text-align: center;
  font-size: 0.9em;
}
</style>
  `;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Dictionary card formatting

export function formatDictionaryFront(entry: CapturedDictionaryEntry): string {
  let front = escapeHtml(entry.word);

  if (entry.pronunciation) {
    front += ` <span class="pronunciation">[${escapeHtml(entry.pronunciation)}]</span>`;
  }

  return front;
}

export function formatDictionaryBack(entry: CapturedDictionaryEntry): string {
  const parts: string[] = [];

  parts.push(`<div class="dictionary-card">`);

  // Primary Meaning (first definition)
  if (entry.definitions && entry.definitions.length > 0) {
    const primary = entry.definitions[0];
    parts.push(`
      <div class="section primary-meaning">
        <h3>Primary Meaning</h3>
        <div class="definition">
          ${primary.partOfSpeech ? `<span class="pos">${escapeHtml(primary.partOfSpeech)}</span>` : ""}
          <span class="text">${escapeHtml(primary.definition)}</span>
        </div>
      </div>
    `);

    // Other Meanings (rest of definitions)
    if (entry.definitions.length > 1) {
      parts.push(`<div class="section other-meanings"><h3>Other Meanings</h3>`);
      entry.definitions.slice(1).forEach((def, i) => {
        parts.push(`
          <div class="definition">
            <span class="num">${i + 1}.</span>
            ${def.partOfSpeech ? `<span class="pos">${escapeHtml(def.partOfSpeech)}</span>` : ""}
            <span class="text">${escapeHtml(def.definition)}</span>
          </div>
        `);
      });
      parts.push(`</div>`);
    }
  } else {
    parts.push(`<p class="no-definitions">No definitions found</p>`);
  }

  // Notes
  if (entry.notes) {
    parts.push(`
      <div class="section notes">
        <h3>Notes</h3>
        <p>${escapeHtml(entry.notes)}</p>
      </div>
    `);
  }

  // Examples
  if (entry.examples && entry.examples.length > 0) {
    parts.push(`<div class="section examples"><h3>Examples</h3><ul>`);
    entry.examples.forEach(ex => {
      parts.push(`<li>${escapeHtml(ex.sentence)}</li>`);
    });
    parts.push(`</ul></div>`);
  }

  // Etymology
  if (entry.etymology) {
    parts.push(`
      <div class="section etymology">
        <h3>Etymology</h3>
        <p>${escapeHtml(entry.etymology)}</p>
      </div>
    `);
  }

  // Related Words (use synonyms if relatedWords not available)
  const relatedWords = entry.relatedWords || entry.synonyms?.map(s => s.word);
  if (relatedWords && relatedWords.length > 0) {
    parts.push(`
      <div class="section related-words">
        <h3>Related Words</h3>
        <p>${relatedWords.map(w => escapeHtml(w)).join(', ')}</p>
      </div>
    `);
  }

  parts.push(`</div>`);

  // Add CSS
  parts.unshift(getDictionaryCardCSS());

  return parts.join("\n");
}

function getDictionaryCardCSS(): string {
  return `
<style>
.dictionary-card {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  padding: 16px;
}

.pronunciation {
  font-weight: normal;
  color: #666;
  font-size: 0.9em;
}

.section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.section h3 {
  font-size: 1em;
  font-weight: 600;
  color: #5352FF;
  margin: 0 0 10px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.primary-meaning .definition {
  font-size: 1.1em;
}

.definition {
  margin: 8px 0;
}

.num {
  font-weight: bold;
  color: #5352FF;
  margin-right: 6px;
}

.pos {
  font-style: italic;
  color: #888;
  margin-right: 8px;
}

.text {
  display: inline;
}

.notes p {
  margin: 0;
  color: #555;
  background: rgba(83, 82, 255, 0.05);
  padding: 10px;
  border-radius: 4px;
}

.examples ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.examples li {
  padding: 8px 12px;
  margin: 6px 0;
  background: rgba(66, 186, 153, 0.05);
  border-left: 3px solid rgba(66, 186, 153, 0.4);
  border-radius: 0 4px 4px 0;
}

.etymology p {
  margin: 0;
  color: #666;
  font-style: italic;
}

.related-words p {
  margin: 0;
  color: #555;
}

.no-definitions {
  color: #999;
  font-style: italic;
}
</style>
  `;
}
