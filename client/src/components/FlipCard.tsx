import { useState } from 'react';
import type {
  Extraction,
  VocabularyData,
  CollocationData,
  SentenceData,
} from '../../../shared/types';

interface Props {
  extraction: Extraction;
}

export default function FlipCard({ extraction }: Props) {
  const [flipped, setFlipped] = useState(false);

  const toggle = () => setFlipped((f) => !f);

  return (
    <div
      className="w-full cursor-pointer select-none"
      style={{ perspective: '1000px' }}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={flipped ? 'Flip to front' : 'Flip to back'}
    >
      <div
        className="relative w-full transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          minHeight: '280px',
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 border border-border bg-white/60 flex flex-col items-center justify-center p-8"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-text-quaternary mb-6">
            {extraction.type === 'vocabulary'
              ? 'VOCABULARY'
              : extraction.type === 'collocation'
                ? 'COLLOCATION'
                : 'SENTENCE'}
          </span>
          <p className="font-serif text-2xl md:text-3xl italic text-center text-text-primary leading-relaxed">
            {extraction.type === 'vocabulary'
              ? (extraction.data as VocabularyData).word
              : extraction.type === 'collocation'
                ? (extraction.data as CollocationData).phrase
                : (extraction.data as SentenceData).sentence}
          </p>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[1.5px] text-text-quaternary">
            点击翻转
          </p>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 border border-border bg-white/60 flex flex-col justify-center p-8 overflow-y-auto"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {extraction.type === 'vocabulary' && (
            <VocabBack data={extraction.data as VocabularyData} />
          )}
          {extraction.type === 'collocation' && (
            <CollocationBack data={extraction.data as CollocationData} />
          )}
          {extraction.type === 'sentence' && (
            <SentenceBack data={extraction.data as SentenceData} />
          )}
        </div>
      </div>
    </div>
  );
}

function VocabBack({ data }: { data: VocabularyData }) {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-xl italic">{data.word}</span>
        <span className="font-mono text-[10px] text-text-quaternary uppercase tracking-[1px]">
          {data.partOfSpeech}
        </span>
      </div>
      <p className="text-sm text-text-secondary leading-relaxed">{data.definition}</p>
      <div className="border-t border-border pt-3">
        <p className="font-mono text-[10px] uppercase tracking-[1px] text-text-quaternary mb-1">EXAMPLE</p>
        <p className="text-sm text-text-tertiary italic">{data.example}</p>
      </div>
    </div>
  );
}

function CollocationBack({ data }: { data: CollocationData }) {
  return (
    <div className="space-y-4">
      <p className="font-serif text-xl italic">{data.phrase}</p>
      <p className="text-sm text-text-secondary leading-relaxed">{data.definition}</p>
      <div className="border-t border-border pt-3">
        <p className="font-mono text-[10px] uppercase tracking-[1px] text-text-quaternary mb-1">EXAMPLE</p>
        <p className="text-sm text-text-tertiary italic">{data.example}</p>
      </div>
    </div>
  );
}

function SentenceBack({ data }: { data: SentenceData }) {
  return (
    <div className="space-y-4">
      <p className="font-serif text-lg italic leading-relaxed">{data.sentence}</p>
      <div className="border-t border-border pt-3">
        <p className="font-mono text-[10px] uppercase tracking-[1px] text-text-quaternary mb-1">ANALYSIS</p>
        <p className="text-sm text-text-secondary leading-relaxed">{data.analysis}</p>
      </div>
      <span className="inline-block font-mono text-[10px] uppercase tracking-[1px] font-medium text-navy border border-navy/30 px-2 py-0.5">
        {data.scenario}
      </span>
    </div>
  );
}
