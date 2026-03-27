import type {
  Extraction,
  ExtractionType,
  ExtractionData,
  VocabularyData,
  CollocationData,
  SentenceData,
  Priority,
} from '../../shared/types.js';

const VALID_TYPES: ExtractionType[] = ['vocabulary', 'collocation', 'sentence'];
const VALID_PRIORITIES: Priority[] = ['high', 'medium', 'low'];

const REQUIRED_FIELDS: Record<ExtractionType, string[]> = {
  vocabulary: ['word', 'definition', 'partOfSpeech', 'example'],
  collocation: ['phrase', 'definition', 'example'],
  sentence: ['sentence', 'analysis', 'scenario'],
};

function validateExtractionData(type: ExtractionType, data: Record<string, unknown>): ExtractionData {
  const requiredFields = REQUIRED_FIELDS[type];
  const missing = requiredFields.filter(
    (field) => data[field] === undefined || data[field] === null || typeof data[field] !== 'string'
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing or invalid required fields for type "${type}": ${missing.join(', ')}`
    );
  }

  if (type === 'vocabulary') {
    return {
      word: data.word as string,
      definition: data.definition as string,
      partOfSpeech: data.partOfSpeech as string,
      example: data.example as string,
    } satisfies VocabularyData;
  }

  if (type === 'collocation') {
    return {
      phrase: data.phrase as string,
      definition: data.definition as string,
      example: data.example as string,
    } satisfies CollocationData;
  }

  return {
    sentence: data.sentence as string,
    analysis: data.analysis as string,
    scenario: data.scenario as string,
  } satisfies SentenceData;
}


export class Parser {
  /**
   * Parse AI JSON response into structured extraction objects.
   * Expects JSON with an "extractions" array.
   */
  static parse(raw: string): Omit<Extraction, 'id' | 'materialId' | 'createdAt'>[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('Invalid JSON: failed to parse AI response');
    }

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Invalid AI response: expected a JSON object');
    }

    const obj = parsed as Record<string, unknown>;
    const extractions = obj.extractions;

    if (!Array.isArray(extractions)) {
      throw new Error('Invalid AI response: "extractions" field must be an array');
    }

    if (extractions.length === 0) {
      return [];
    }

    return extractions.map((item: unknown, index: number) => {
      if (typeof item !== 'object' || item === null) {
        throw new Error(`Invalid extraction at index ${index}: expected an object`);
      }

      const entry = item as Record<string, unknown>;
      const type = entry.type as string;

      if (!VALID_TYPES.includes(type as ExtractionType)) {
        throw new Error(
          `Invalid extraction type at index ${index}: "${type}". Must be one of: ${VALID_TYPES.join(', ')}`
        );
      }

      const priority = (entry.priority as string) || 'medium';
      if (!VALID_PRIORITIES.includes(priority as Priority)) {
        throw new Error(
          `Invalid priority at index ${index}: "${priority}". Must be one of: ${VALID_PRIORITIES.join(', ')}`
        );
      }

      const data = validateExtractionData(type as ExtractionType, entry);

      return {
        type: type as ExtractionType,
        data,
        priority: priority as Priority,
        mastered: false,
      };
    });
  }

  /**
   * Serialize extraction objects to a JSON string (for storage or round-trip).
   */
  static format(extractions: Omit<Extraction, 'id' | 'materialId' | 'createdAt'>[]): string {
    const items = extractions.map((ext) => {
      const base = {
        type: ext.type,
        priority: ext.priority,
        ...ext.data,
      };
      return base;
    });

    return JSON.stringify({ extractions: items });
  }
}
