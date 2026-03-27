import { type ReactNode } from 'react';
import type { Extraction, VocabularyData, CollocationData } from '../../../shared/types';

/**
 * Takes original text + vocabulary/collocation extractions and returns
 * React elements with highlighted words/phrases.
 */
export function highlightText(
  text: string,
  extractions: Extraction[],
): ReactNode[] {
  // Collect all terms to highlight
  const terms: string[] = [];
  for (const ext of extractions) {
    if (ext.type === 'vocabulary') {
      terms.push((ext.data as VocabularyData).word);
    } else if (ext.type === 'collocation') {
      terms.push((ext.data as CollocationData).phrase);
    }
  }

  if (terms.length === 0) {
    return [text];
  }

  // Sort by length descending so longer phrases match first
  terms.sort((a, b) => b.length - a.length);

  // Build regex — escape special chars
  const escaped = terms.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');

  const parts = text.split(pattern);
  const termSet = new Set(terms.map((t) => t.toLowerCase()));

  return parts.map((part, i) => {
    if (termSet.has(part.toLowerCase())) {
      return (
        <mark
          key={i}
          className="bg-gold/30 text-navy font-medium px-0.5"
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}
