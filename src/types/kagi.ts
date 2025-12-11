// Type definitions for Kagi Translate and Dictionary API responses

export interface KagiWordInsight {
  id: string;
  original_text: string;
  type: string;
  variations: Array<{
    text: string;
    explanation: string;
  }>;
}

export interface KagiWordInsightsResponse {
  insights: KagiWordInsight[];
  marked_translation: string;
}

export interface KagiAlternativeTranslation {
  translation: string;
  explanation: string;
}

export interface KagiAlternativeTranslationsResponse {
  original_description: string;
  elements: KagiAlternativeTranslation[];
}

export interface KagiTextAlignment {
  source_blocks: string[];
  target_blocks: string[];
  source_roles: string[];
  target_roles: string[];
}

export interface CapturedTranslation {
  sourceText: string;
  sourceLang: string;
  targetText: string;
  targetLang: string;
  quality: "standard" | "best";

  // From alternative-translations API
  description?: string;
  alternatives?: KagiAlternativeTranslation[];

  // From word-insights API (accumulated as user clicks)
  insights?: KagiWordInsight[];

  // From text-alignments API
  alignments?: KagiTextAlignment;

  // Audio data (base64 encoded)
  audioData?: string;
  audioFilename?: string;

  // Metadata
  timestamp: number;
}

// Dictionary-specific types
export interface DictionaryDefinition {
  partOfSpeech: string;
  definition: string;
  examples?: string[];
}

export interface DictionarySynonym {
  word: string;
  partOfSpeech?: string;
}

export interface DictionaryExample {
  sentence: string;
  translation?: string;
}

export interface CapturedDictionaryEntry {
  word: string;
  language: string;
  pronunciation?: string;
  definitions: DictionaryDefinition[];
  synonyms?: DictionarySynonym[];
  examples?: DictionaryExample[];
  etymology?: string;
  notes?: string;
  relatedWords?: string[];

  // Audio data (base64 encoded)
  audioData?: string;
  audioFilename?: string;

  // Metadata
  timestamp: number;
}
