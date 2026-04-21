import { useState, useEffect, useCallback } from 'react';
import type { Extraction, ExtractionType, Material } from '../../../shared/types';
import { getReviewCards, getMaterials, updateMastery } from '../api';
import FlipCard from '../components/FlipCard';

const TYPE_OPTIONS: { value: ExtractionType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'vocabulary', label: '词汇' },
  { value: 'collocation', label: '词组' },
  { value: 'sentence', label: '句子' },
];

type Phase = 'setup' | 'review' | 'summary';

export default function ReviewMode() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | undefined>();
  const [typeFilter, setTypeFilter] = useState<ExtractionType | 'all'>('all');

  // Review state
  const [cards, setCards] = useState<Extraction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [totalCards, setTotalCards] = useState(0);

  useEffect(() => {
    document.title = '复习模式 - IELTS Reviewer';
    getMaterials().then(setMaterials).catch(() => {});
  }, []);

  const startReview = useCallback(async () => {
    try {
      const params: Record<string, unknown> = {};
      if (selectedMaterialId) params.materialId = selectedMaterialId;
      if (typeFilter !== 'all') params.type = typeFilter;
      const data = await getReviewCards(params as never);
      if (data.length === 0) {
        return;
      }
      setCards(data);
      setTotalCards(data.length);
      setCurrentIndex(0);
      setMasteredCount(0);
      setPhase('review');
    } catch {
      // ignore
    }
  }, [selectedMaterialId, typeFilter]);

  const handleMastered = async () => {
    const card = cards[currentIndex];
    if (!card) return;
    try {
      await updateMastery(card.id, true);
      setMasteredCount((c) => c + 1);
    } catch {
      // ignore
    }
    goNext();
  };

  const goNext = () => {
    if (currentIndex + 1 >= cards.length) {
      setPhase('summary');
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const resetReview = () => {
    setPhase('setup');
    setCards([]);
    setCurrentIndex(0);
    setMasteredCount(0);
    setTotalCards(0);
  };

  // --- SETUP PHASE ---
  if (phase === 'setup') {
    return (
      <div className="max-w-xl mx-auto">
        <h1 className="font-serif text-2xl text-text-primary mb-8">复习模式</h1>

        {/* Scope */}
        <section className="mb-6">
          <label className="block font-mono text-xs uppercase tracking-[2px] font-medium text-text-secondary mb-3">
            复习范围
          </label>
          <div className="flex flex-col gap-0">
            <button
              onClick={() => setSelectedMaterialId(undefined)}
              className={[
                'px-4 py-3 text-left font-mono text-xs uppercase tracking-[1px] border border-border transition-colors',
                !selectedMaterialId
                  ? 'bg-dark text-white border-dark'
                  : 'text-text-secondary hover:text-text-primary',
              ].join(' ')}
            >
              全部材料
            </button>
            {materials.map((mat) => (
              <button
                key={mat.id}
                onClick={() => setSelectedMaterialId(mat.id)}
                className={[
                  'px-4 py-3 text-left text-xs border border-border transition-colors',
                  selectedMaterialId === mat.id
                    ? 'bg-dark text-white border-dark'
                    : 'text-text-secondary hover:text-text-primary',
                ].join(' ')}
                style={{ marginTop: '-1px' }}
              >
                {mat.title}
              </button>
            ))}
          </div>
        </section>

        {/* Type */}
        <section className="mb-8">
          <label className="block font-mono text-xs uppercase tracking-[2px] font-medium text-text-secondary mb-3">
            摘录类型
          </label>
          <div className="flex gap-0">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTypeFilter(opt.value)}
                className={[
                  'flex-1 py-2.5 font-mono text-xs uppercase tracking-[1px] font-medium border border-border transition-colors',
                  typeFilter === opt.value
                    ? 'bg-dark text-white border-dark'
                    : 'text-text-secondary hover:text-text-primary',
                ].join(' ')}
                style={{ marginLeft: opt.value === 'all' ? 0 : '-1px' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={startReview}
          className="w-full font-mono text-xs uppercase tracking-[2px] font-medium py-3 bg-dark text-white border border-dark hover:bg-dark/80 transition-colors"
        >
          开始复习
        </button>
      </div>
    );
  }

  // --- REVIEW PHASE ---
  if (phase === 'review') {
    const card = cards[currentIndex];
    return (
      <div className="max-w-xl mx-auto">
        {/* Progress */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={resetReview}
            className="font-mono text-xs uppercase tracking-[2px] text-text-tertiary hover:text-text-primary transition-colors"
          >
            ← 退出
          </button>
          <span className="font-mono text-xs uppercase tracking-[2px] text-text-quaternary">
            {currentIndex + 1} / {totalCards}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-px bg-border mb-8 relative">
          <div
            className="absolute top-0 left-0 h-px bg-dark transition-all"
            style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
          />
        </div>

        {/* Card */}
        {card && <FlipCard extraction={card} />}

        {/* Actions */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={handleMastered}
            className="flex-1 font-mono text-xs uppercase tracking-[2px] font-medium py-3 bg-dark text-white border border-dark hover:bg-dark/80 transition-colors"
          >
            已掌握
          </button>
          <button
            onClick={goNext}
            className="flex-1 font-mono text-xs uppercase tracking-[2px] font-medium py-3 border border-border text-text-secondary hover:text-text-primary transition-colors"
          >
            下一张
          </button>
        </div>
      </div>
    );
  }

  // --- SUMMARY PHASE ---
  return (
    <div className="max-w-xl mx-auto text-center py-12">
      <h1 className="font-serif text-3xl text-text-primary mb-8">复习完成</h1>

      <div className="border border-border p-8 mb-8">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[2px] text-text-quaternary mb-2">
              复习总数
            </p>
            <p className="font-serif text-4xl text-text-primary">{totalCards}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[2px] text-text-quaternary mb-2">
              本次已掌握
            </p>
            <p className="font-serif text-4xl text-gold">{masteredCount}</p>
          </div>
        </div>
      </div>

      <button
        onClick={resetReview}
        className="font-mono text-xs uppercase tracking-[2px] font-medium px-8 py-3 bg-dark text-white border border-dark hover:bg-dark/80 transition-colors"
      >
        返回
      </button>
    </div>
  );
}
