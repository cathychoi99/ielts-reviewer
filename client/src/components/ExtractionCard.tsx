import type {
  Extraction,
  VocabularyData,
  CollocationData,
  SentenceData,
} from '../../../shared/types';

interface Props {
  extraction: Extraction;
  onToggleMastery?: (id: number, mastered: boolean) => void;
  onDelete?: (id: number) => void;
  showSource?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  vocabulary: 'VOCABULARY',
  collocation: 'COLLOCATION',
  sentence: 'SENTENCE',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: 'HIGH',
  medium: 'MED',
  low: 'LOW',
};

export default function ExtractionCard({ extraction, onToggleMastery, onDelete, showSource }: Props) {
  const { type, data, priority, mastered, id } = extraction;

  return (
    <div className="border border-border p-5 bg-white/50">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[1.5px] font-medium text-navy">
            {TYPE_LABELS[type]}
          </span>
          {priority === 'high' && (
            <span className="font-mono text-[10px] uppercase tracking-[1px] font-medium text-gold">
              {PRIORITY_LABELS[priority]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              onClick={() => onDelete(id)}
              className="font-mono text-[10px] uppercase tracking-[1px] font-medium px-3 py-1 text-text-quaternary hover:text-red-500 transition-colors"
            >
              删除
            </button>
          )}
          {onToggleMastery && (
            <button
              onClick={() => onToggleMastery(id, !mastered)}
              className={[
                'font-mono text-[10px] uppercase tracking-[1px] font-medium px-3 py-1 border transition-colors',
                mastered
                  ? 'border-border text-text-tertiary hover:text-text-primary'
                  : 'border-dark bg-dark text-white hover:bg-dark/80',
              ].join(' ')}
            >
              {mastered ? '取消掌握' : '标记已掌握'}
            </button>
          )}
        </div>
      </div>

      {/* Body — varies by type */}
      {type === 'vocabulary' && <VocabularyBody data={data as VocabularyData} />}
      {type === 'collocation' && <CollocationBody data={data as CollocationData} />}
      {type === 'sentence' && <SentenceBody data={data as SentenceData} />}

      {/* Source link */}
      {showSource && extraction.materialTitle && (
        <p className="mt-3 pt-3 border-t border-border font-mono text-[10px] text-text-quaternary uppercase tracking-[1px]">
          来源: {extraction.materialTitle}
        </p>
      )}
    </div>
  );
}


function VocabularyBody({ data }: { data: VocabularyData }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-xl italic text-text-primary">{data.word}</span>
        <span className="font-mono text-[10px] text-text-quaternary uppercase tracking-[1px]">
          {data.partOfSpeech}
        </span>
      </div>
      <p className="text-sm text-text-secondary leading-relaxed">{data.definition}</p>
      <p className="text-sm text-text-tertiary italic leading-relaxed border-l-2 border-border pl-3">
        {data.example}
      </p>
    </div>
  );
}

function CollocationBody({ data }: { data: CollocationData }) {
  return (
    <div className="space-y-2">
      <p className="font-serif text-xl italic text-text-primary">{data.phrase}</p>
      <p className="text-sm text-text-secondary leading-relaxed">{data.definition}</p>
      <p className="text-sm text-text-tertiary italic leading-relaxed border-l-2 border-border pl-3">
        {data.example}
      </p>
    </div>
  );
}

function SentenceBody({ data }: { data: SentenceData }) {
  return (
    <div className="space-y-2">
      <p className="font-serif text-lg italic text-text-primary leading-relaxed">
        {data.sentence}
      </p>
      <p className="text-sm text-text-secondary leading-relaxed">{data.analysis}</p>
      <span className="inline-block font-mono text-[10px] uppercase tracking-[1px] font-medium text-navy border border-navy/30 px-2 py-0.5">
        {data.scenario}
      </span>
    </div>
  );
}
