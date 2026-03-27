import { describe, it, expect } from 'vitest';
import { Parser } from './parser.js';

describe('Parser.parse', () => {
  it('should parse a valid AI response with all three types', () => {
    const raw = JSON.stringify({
      extractions: [
        {
          type: 'vocabulary',
          word: 'ubiquitous',
          definition: 'present everywhere',
          partOfSpeech: 'adjective',
          example: 'Smartphones are ubiquitous.',
          priority: 'high',
        },
        {
          type: 'collocation',
          phrase: 'make a decision',
          definition: 'to decide',
          example: 'We need to make a decision soon.',
          priority: 'medium',
        },
        {
          type: 'sentence',
          sentence: 'The implications are far-reaching.',
          analysis: 'Good for academic writing',
          scenario: 'writing',
          priority: 'low',
        },
      ],
    });

    const result = Parser.parse(raw);
    expect(result).toHaveLength(3);

    expect(result[0].type).toBe('vocabulary');
    expect(result[0].data).toEqual({
      word: 'ubiquitous',
      definition: 'present everywhere',
      partOfSpeech: 'adjective',
      example: 'Smartphones are ubiquitous.',
    });
    expect(result[0].priority).toBe('high');
    expect(result[0].mastered).toBe(false);

    expect(result[1].type).toBe('collocation');
    expect(result[1].data).toEqual({
      phrase: 'make a decision',
      definition: 'to decide',
      example: 'We need to make a decision soon.',
    });

    expect(result[2].type).toBe('sentence');
    expect(result[2].data).toEqual({
      sentence: 'The implications are far-reaching.',
      analysis: 'Good for academic writing',
      scenario: 'writing',
    });
  });

  it('should parse an empty extractions array', () => {
    const raw = JSON.stringify({ extractions: [] });
    const result = Parser.parse(raw);
    expect(result).toEqual([]);
  });

  it('should default priority to medium when not provided', () => {
    const raw = JSON.stringify({
      extractions: [
        {
          type: 'vocabulary',
          word: 'test',
          definition: 'a test',
          partOfSpeech: 'noun',
          example: 'This is a test.',
        },
      ],
    });
    const result = Parser.parse(raw);
    expect(result[0].priority).toBe('medium');
  });

  it('should throw on invalid JSON', () => {
    expect(() => Parser.parse('not json')).toThrow('Invalid JSON');
  });

  it('should throw when response is not an object', () => {
    expect(() => Parser.parse('"just a string"')).toThrow('expected a JSON object');
  });

  it('should throw when extractions field is missing', () => {
    expect(() => Parser.parse('{}')).toThrow('"extractions" field must be an array');
  });

  it('should throw when extractions is not an array', () => {
    expect(() => Parser.parse('{"extractions": "not array"}')).toThrow(
      '"extractions" field must be an array'
    );
  });

  it('should throw on invalid extraction type', () => {
    const raw = JSON.stringify({
      extractions: [{ type: 'unknown', word: 'test' }],
    });
    expect(() => Parser.parse(raw)).toThrow('Invalid extraction type');
  });

  it('should throw on missing required vocabulary fields', () => {
    const raw = JSON.stringify({
      extractions: [{ type: 'vocabulary', word: 'test' }],
    });
    expect(() => Parser.parse(raw)).toThrow('Missing or invalid required fields');
  });

  it('should throw on missing required collocation fields', () => {
    const raw = JSON.stringify({
      extractions: [{ type: 'collocation', phrase: 'test' }],
    });
    expect(() => Parser.parse(raw)).toThrow('Missing or invalid required fields');
  });

  it('should throw on missing required sentence fields', () => {
    const raw = JSON.stringify({
      extractions: [{ type: 'sentence', sentence: 'test' }],
    });
    expect(() => Parser.parse(raw)).toThrow('Missing or invalid required fields');
  });

  it('should throw when extraction item is not an object', () => {
    const raw = JSON.stringify({ extractions: ['not an object'] });
    expect(() => Parser.parse(raw)).toThrow('expected an object');
  });

  it('should throw on invalid priority value', () => {
    const raw = JSON.stringify({
      extractions: [
        {
          type: 'vocabulary',
          word: 'test',
          definition: 'a test',
          partOfSpeech: 'noun',
          example: 'example',
          priority: 'critical',
        },
      ],
    });
    expect(() => Parser.parse(raw)).toThrow('Invalid priority');
  });
});

describe('Parser.format', () => {
  it('should serialize extractions to JSON string', () => {
    const extractions = [
      {
        type: 'vocabulary' as const,
        data: {
          word: 'ubiquitous',
          definition: 'present everywhere',
          partOfSpeech: 'adjective',
          example: 'Smartphones are ubiquitous.',
        },
        priority: 'high' as const,
        mastered: false,
      },
    ];

    const result = Parser.format(extractions);
    const parsed = JSON.parse(result);

    expect(parsed.extractions).toHaveLength(1);
    expect(parsed.extractions[0].type).toBe('vocabulary');
    expect(parsed.extractions[0].word).toBe('ubiquitous');
    expect(parsed.extractions[0].priority).toBe('high');
  });

  it('should handle empty array', () => {
    const result = Parser.format([]);
    expect(JSON.parse(result)).toEqual({ extractions: [] });
  });
});

describe('Parser round-trip', () => {
  it('should produce equivalent results for parse(format(x))', () => {
    const original = [
      {
        type: 'vocabulary' as const,
        data: {
          word: 'ubiquitous',
          definition: 'present everywhere',
          partOfSpeech: 'adjective',
          example: 'Smartphones are ubiquitous.',
        },
        priority: 'high' as const,
        mastered: false,
      },
      {
        type: 'collocation' as const,
        data: {
          phrase: 'make a decision',
          definition: 'to decide',
          example: 'We need to make a decision soon.',
        },
        priority: 'medium' as const,
        mastered: false,
      },
      {
        type: 'sentence' as const,
        data: {
          sentence: 'The implications are far-reaching.',
          analysis: 'Good for academic writing',
          scenario: 'writing',
        },
        priority: 'low' as const,
        mastered: false,
      },
    ];

    const formatted = Parser.format(original);
    const roundTripped = Parser.parse(formatted);

    expect(roundTripped).toEqual(original);
  });
});
