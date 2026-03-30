// Shared types for IELTS Material Reviewer
// This file is referenced by both client and server

// --- Enums / Union Types ---

export type SourceTag = 'vlog' | 'article' | 'podcast' | 'other';
export type ExtractionType = 'vocabulary' | 'collocation' | 'sentence';
export type BandLevel = '5.0' | '5.5' | '6.0' | '6.5' | '7+';
export type Priority = 'high' | 'medium' | 'low';
export type MasteryStatus = 'unmastered' | 'mastered';
export type ParseStatus = 'idle' | 'parsing' | 'done' | 'error';

// --- Material Types ---

export interface Material {
  id: number;
  title: string;
  sourceTag: SourceTag;
  parseStatus: ParseStatus;
  createdAt: string;
  extractionCount?: number; // 列表视图附带
}

export interface MaterialDetail extends Material {
  content: string;
  translation?: string[] | null;
}

// --- Extraction Data Types ---

export interface VocabularyData {
  word: string;
  definition: string;
  partOfSpeech: string;
  example: string;
}

export interface CollocationData {
  phrase: string;
  definition: string;
  example: string;
}

export interface SentenceData {
  sentence: string;
  analysis: string;
  scenario: string;
}

export type ExtractionData = VocabularyData | CollocationData | SentenceData;

// --- Extraction ---

export interface Extraction {
  id: number;
  materialId: number;
  type: ExtractionType;
  data: ExtractionData;
  priority: Priority;
  mastered: boolean;
  createdAt: string;
  materialTitle?: string; // 摘录本视图附带
}

// --- User Settings ---

export interface UserSettings {
  bandLevel: BandLevel;
  apiKey: string;
  apiBaseUrl: string;
}

// --- Input / Filter / Params ---

export interface CreateMaterialInput {
  title: string;
  sourceTag: SourceTag;
  content: string;
}

export interface ExtractionFilter {
  type?: ExtractionType;
  mastery?: MasteryStatus;
  sourceTag?: SourceTag;
}

export interface ReviewParams {
  materialId?: number;   // 不传则全部
  type?: ExtractionType; // 不传则全部类型
}

// --- API Response Types ---

export interface ApiErrorResponse {
  error: string;
}

export interface ApiSuccessResponse<T> {
  data: T;
}
