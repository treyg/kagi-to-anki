// AnkiConnect API integration

import type {
  AnkiConnectRequest,
  AnkiConnectResponse,
  AnkiNote,
} from "../types/anki";

const ANKI_CONNECT_URL = "http://127.0.0.1:8765";

export class AnkiConnectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnkiConnectError";
  }
}

async function invoke<T = unknown>(
  action: string,
  params?: Record<string, unknown>
): Promise<T> {
  const request: AnkiConnectRequest = {
    action,
    version: 6,
    params,
  };

  try {
    const response = await fetch(ANKI_CONNECT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new AnkiConnectError(
        `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data: AnkiConnectResponse<T> = await response.json();

    if (data.error) {
      throw new AnkiConnectError(data.error);
    }

    return data.result as T;
  } catch (error) {
    if (error instanceof AnkiConnectError) {
      throw error;
    }
    throw new AnkiConnectError(`Failed to connect to Anki: ${error}`);
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    await invoke("version");
    return true;
  } catch {
    return false;
  }
}

export async function getDeckNames(): Promise<string[]> {
  return invoke<string[]>("deckNames");
}

export async function getModelNames(): Promise<string[]> {
  return invoke<string[]>("modelNames");
}

export async function createModel(): Promise<void> {
  const modelName = "Kagi Translation";

  // Check if model already exists
  const existingModels = await getModelNames();
  if (existingModels.includes(modelName)) {
    return;
  }

  // Create the model
  await invoke("createModel", {
    modelName,
    inOrderFields: [
      "Front",
      "Back",
      "Audio",
      "SourceLang",
      "TargetLang",
      "Quality",
    ],
    css: `
.card {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 16px;
  text-align: center;
  color: #e0e0e0;
  background-color: #1a1a1a;
  padding: 20px;
}

.front {
  font-size: 1.8em;
  font-weight: bold;
  padding: 40px 20px;
}

.back {
  text-align: left;
}

@media (prefers-color-scheme: light) {
  .card {
    color: #1a1a1a;
    background-color: #ffffff;
  }
}
    `,
    cardTemplates: [
      {
        Name: "Card 1",
        Front: '<div class="front">{{Front}}</div>',
        Back: `
<div class="back">
  {{Back}}
  {{Audio}}
</div>
        `,
      },
    ],
  });

}

export async function addNote(note: AnkiNote): Promise<number> {
  return invoke<number>("addNote", { note });
}

export async function canAddNotes(notes: AnkiNote[]): Promise<boolean[]> {
  return invoke<boolean[]>("canAddNotes", { notes });
}
