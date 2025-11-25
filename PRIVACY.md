# Privacy Policy for Kagi Translate to Anki

**Last Updated:** November 24, 2025

## Overview

Kagi Translate to Anki is a browser extension that helps you create Anki flashcards from Kagi Translate. This extension is designed with privacy in mind and operates entirely locally on your device.

## Data Collection

**We do not collect, store, or transmit any personal information to external servers.**

### What Data is Processed Locally

The extension processes the following data **only on your local device**:

1. **Translation Data from Kagi Translate:**

   - Source text and target text
   - Language pairs (e.g., English → Spanish)
   - Alternative translations and explanations
   - Word-level linguistic insights
   - Translation quality setting

2. **User Settings:**

   - Selected Anki deck name
   - Custom tags for flashcards
   - Audio pronunciation preference (enabled/disabled)
   - Stored locally using Chrome's `chrome.storage.sync` API

3. **Usage Statistics:**
   - Count of flashcards created
   - Stored locally using Chrome's `chrome.storage.local` API

### What Data is Sent to Third Parties

The extension communicates with the following services **only when you explicitly trigger an action**:

1. **Kagi Translate (translate.kagi.com):**

   - **When:** When you visit Kagi Translate and the page loads translation data
   - **What:** The extension reads data from Kagi's API responses (translations, alternatives, word insights)
   - **How:** Via interception of Kagi's own API requests (no additional data is sent)
   - **Audio:** If audio is enabled in settings, the extension fetches audio pronunciation files from `https://translate.kagi.com/api/speech` with your translation text
   - **Privacy Note:** This data is already being sent to Kagi when you use their service normally

2. **AnkiConnect (localhost:8765 or 127.0.0.1:8765):**
   - **When:** When you click "Save to Anki" button
   - **What:** Translation data, formatted HTML, and audio files (if enabled)
   - **Where:** Only to your **local Anki application** running on your computer
   - **Privacy Note:** This is a local-only connection; no data leaves your device

## Permissions Justification

The extension requires the following permissions:

### 1. `storage`

- **Purpose:** Save your preferences (deck name, tags, audio setting) and track card count
- **Scope:** Data is stored in your browser's sync storage and never leaves your device

### 2. `activeTab`

- **Purpose:** Inject the "Save to Anki" button on Kagi Translate pages
- **Scope:** Only activates on `translate.kagi.com`

### 3. `host_permissions` for `https://translate.kagi.com/*`

- **Purpose:**
  - Read translation data from Kagi's page
  - Intercept Kagi's API responses to capture alternatives and word insights
  - Fetch audio pronunciation files (when enabled)
- **What is accessed:** Translation text, alternatives, word insights, and audio files

### 4. `host_permissions` for `http://localhost:8765/*` and `http://127.0.0.1:8765/*`

- **Purpose:** Communicate with AnkiConnect (your local Anki application)
- **What is sent:** Formatted flashcards with translation data and audio
- **Privacy Note:** This is entirely local; AnkiConnect runs on your computer

## Data Storage

All data is stored **locally** in your browser:

- **Settings:** Stored using `chrome.storage.sync` (syncs across your devices if you're signed into Chrome/Firefox)
- **Card Count:** Stored using `chrome.storage.local` (device-specific)
- **No Cloud Storage:** We do not use any external databases or cloud services

## Third-Party Services

This extension does not use:

- Analytics services (no Google Analytics, Mixpanel, etc.)
- Crash reporting services
- Advertising networks
- External APIs (except Kagi Translate and your local Anki)

## Audio Data

When the "Include audio pronunciation" setting is enabled:

1. The extension fetches audio files from Kagi's speech API: `https://translate.kagi.com/api/speech`
2. Audio is converted to WAV format locally
3. Audio is embedded in your Anki flashcard
4. No audio data is stored by the extension or sent to any other service

You can disable audio in Settings at any time.

## Open Source

This extension is open source and licensed under the MIT License.

## Changes to This Policy

If we make changes to this privacy policy, we will update the "Last Updated" date at the top of this document and publish a new version with the extension update.

## Your Rights

Since we don't collect or store your data on any servers, there is no data to request, delete, or modify. All data remains under your control on your local device and can be cleared by:

1. Removing the extension
2. Clearing browser storage
3. Adjusting extension settings

---

**Summary:** This extension processes translation data locally, communicates only with Kagi Translate (to fetch translations/audio) and your local Anki app (to save flashcards). No personal data is collected, tracked, or sent to external servers.
