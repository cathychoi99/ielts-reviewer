import { useEffect, useState, useCallback } from 'react';
import type { Extraction, ExtractionType, MasteryStatus, SourceTag } from '../../../shared/types';
import { getExtractions, updateMastery, deleteExtraction } from '../api';
import ExtractionCard from '../components/ExtractionCard';
import { Link } from 'react-router-dom';

const TYPE_OPTIONS: { value: ExtractionType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'vocabulary', label: '词汇' },
  { value: 'collocation', label: '词组' },
  { value: 'sentence', label: '句子' },
];

const STATUS_OPTIONS: { value: MasteryStatus | 'all'; label: string }[] = [
  { value: 'unmastered', label: '未掌握' },
  { value: 'mastered', label: '已掌握' },
  { value: 'all', label: '全部' },
];

const TAG_OPTIONS: { value: SourceTag | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'vlog', label: 'Vlog' },
  { value: 'article', label: '文章' },
  { value: 'podcast', label: '播客' },
  { value: 'other', label: '其他' },
];

export default function ExtractionBook() {
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<ExtractionType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<MasteryStatus | 'all'>('unmastered');
  const [tagFilter, setTagFilter] = useState<SourceTag | 'all'>('all');

  const loadExtractions = useCallback(async () => {
    setLoading(true);
    try {
      const filter: Record<string, string> = {};
      if (typeFilter !== 'all') filter.type = typeFilter;
      if (statusFilter !== 'all') filter.mastery = statusFilter;
      if (tagFilter !== 'all') filter.sourceTag = tagFilter;
      const data = await getExtractions(filter as never);
      setExtractions(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, tagFilter]);

  useEffect(() => {
    document.title = '摘录本 - IELTS Reviewer';
    loadExtractions();
  }, [loadExtractions]);

  const handleToggleMastery = async (id: number, mastered: boolean) => {
    try {
      const updated = await updateMastery(id, mastered);
      setExtractions((prev) =>
        prev.map((e) => (e.id === id ? { ...e, mastered: updated.mastered } : e)),
      );
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteExtraction(id);
      setExtractions((prev) => prev.filter((e) => e.id !== id));
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <h1 className="font-serif text-2xl text-text-primary mb-6">摘录本</h1>

      {/* Filters */}
      <div className="space-y-4 mb-8">
        {/* Type filter */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[2px] text-text-quaternary mb-2">
            类型
          </label>
          <div className="flex gap-0">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTypeFilter(opt.value)}
                className={[
                  'px-4 py-2 font-mono text-[10px] uppercase tracking-[1.5px] font-medium border border-border transition-colors',
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
        </div>

        {/* Status filter */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[2px] text-text-quaternary mb-2">
            状态
          </label>
          <div className="flex gap-0">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={[
                  'px-4 py-2 font-mono text-[10px] uppercase tracking-[1.5px] font-medium border border-border transition-colors',
                  statusFilter === opt.value
                    ? 'bg-dark text-white border-dark'
                    : 'text-text-secondary hover:text-text-primary',
                ].join(' ')}
                style={{ marginLeft: opt.value === 'unmastered' ? 0 : '-1px' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Source tag filter */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[2px] text-text-quaternary mb-2">
            来源
          </label>
          <div className="flex gap-0 flex-wrap">
            {TAG_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTagFilter(opt.value)}
                className={[
                  'px-4 py-2 font-mono text-[10px] uppercase tracking-[1.5px] font-medium border border-border transition-colors',
                  tagFilter === opt.value
                    ? 'bg-dark text-white border-dark'
                    : 'text-text-secondary hover:text-text-primary',
                ].join(' ')}
                style={{ marginLeft: opt.value === 'all' ? 0 : '-1px' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <p className="font-mono text-xs uppercase tracking-[2px] text-text-quaternary">加载中...</p>
        </div>
      ) : extractions.length === 0 ? (
        <div className="border border-border p-12 text-center">
          <p className="font-serif text-lg text-text-tertiary italic">暂无摘录</p>
        </div>
      ) : (
        <div className="space-y-4">
          {extractions.map((ext) => (
            <div key={ext.id}>
              <ExtractionCard
                extraction={ext}
                onToggleMastery={handleToggleMastery}
                onDelete={handleDelete}
                showSource
              />
              {ext.materialId && (
                <Link
                  to={`/materials/${ext.materialId}`}
                  className="block mt-1 font-mono text-[10px] uppercase tracking-[1px] text-navy hover:text-dark transition-colors"
                >
                  查看原文 →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
