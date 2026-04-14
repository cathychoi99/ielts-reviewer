import { type ReactNode } from 'react';
import type { Extraction, VocabularyData, CollocationData, SentenceData } from '../../../shared/types';

/**
 * Build a flexible regex pattern from a term:
 * - Escape special regex chars
 * - Replace spaces/hyphens with a pattern that matches any combo of spaces/hyphens
 *   so "self-judgment" matches "self- judgment", "self judgment", etc.
 */
function flexPattern(term: string): string {
  // Escape special regex chars except hyphens and spaces (we handle those separately)
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Replace any sequence of whitespace/hyphens with a flexible matcher
  return escaped.replace(/[\s\-]+/g, '[\\s\\-]+');
}

/**
 * Normalize a string for comparison: collapse whitespace/hyphens
 */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s\-]+/g, ' ').trim();
}

export function highlightText(
  text: string,
  extractions: Extraction[],
): ReactNode[] {
  const terms: string[] = [];
  for (const ext of extractions) {
    if (ext.type === 'vocabulary') {
      terms.push((ext.data as VocabularyData).word);
    } else if (ext.type === 'collocation') {
      terms.push((ext.data as CollocationData).phrase);
    } else if (ext.type === 'sentence') {
      terms.push((ext.data as SentenceData).sentence);
    }
  }

  if (terms.length === 0) return [text];

  // Sort by length descending so longer phrases match first
  terms.sort((a, b) => b.length - a.length);

  const patterns = terms.map(flexPattern);
  const pattern = new RegExp(`(${patterns.join('|')})`, 'gi');

  const parts = text.split(pattern);
  const termSet = new Set(terms.map(normalize));

  return parts.map((part, i) => {
    if (termSet.has(normalize(part))) {
      return (
        <mark key={i} className="bg-gold/30 text-navy font-medium px-0.5">
          {part}
        </mark>
      );
    }
    return part;
  });
}
