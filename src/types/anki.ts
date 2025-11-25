// Type definitions for AnkiConnect API

export interface AnkiConnectRequest {
  action: string;
  version: 6;
  params?: Record<string, unknown>;
}

export interface AnkiConnectResponse<T = unknown> {
  result: T | null;
  error: string | null;
}

export interface AnkiNote {
  deckName: string;
  modelName: string;
  fields: Record<string, string>;
  options?: {
    allowDuplicate?: boolean;
    duplicateScope?: string;
  };
  tags?: string[];
  audio?: Array<{
    data: string; // base64
    filename: string;
    fields: string[];
  }>;
}

export interface AnkiDeckStats {
  deck_id: number;
  name: string;
  new_count: number;
  learn_count: number;
  review_count: number;
}

// Model for our custom Kagi Translation note type
export interface KagiAnkiNoteFields {
  Front: string;
  Back: string;
  Audio: string;
  SourceLang: string;
  TargetLang: string;
  Quality: string;
}
