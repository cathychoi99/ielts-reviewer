import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { MaterialDetail as MaterialDetailType, Extraction, ExtractionType } from '../../../shared/types';
import { getMaterial, getMaterialExtractions, parseMaterial, updateMastery, deleteExtraction, deleteMaterial, translateMaterial } from '../api';
import ExtractionCard from '../components/ExtractionCard';
import SelectionPopup from '../components/SelectionPopup';
import { highlightText } from '../utils/highlight';

const TYPE_FILTERS: { value: ExtractionType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'vocabulary', label: '词汇' },
  { value: 'collocation', label: '词组' },
  { value: 'sentence', label: '句子' },
];

const TAG_LABELS: Record<string, string> = {
  vlog: 'VLOG',
  article: 'ARTICLE',
  podcast: 'PODCAST',
  other: 'OTHER',
};

export default function MaterialDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const textContainerRef = useRef<HTMLDivElement>(null);
  const [material, setMaterial] = useState<MaterialDetailType | null>(null);
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [tab, setTab] = useState<'text' | 'extractions'>('text');
  const [typeFilter, setTypeFilter] = useState<ExtractionType | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [translations, setTranslations] = useState<string[] | null>(null);
  const [translating, setTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [mat, exts] = await Promise.all([
        getMaterial(Number(id)),
        getMaterialExtractions(Number(id)),
      ]);
      setMaterial(mat);
      setExtractions(exts);
      if (mat.parseStatus === 'parsing') setParsing(true);
      else setParsing(false);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll while parsing
  useEffect(() => {
    if (!parsing || !id) return;
    const interval = setInterval(async () => {
      try {
        const mat = await getMaterial(Number(id));
        setMaterial(mat);
        if (mat.parseStatus !== 'parsing') {
          setParsing(false);
          const exts = await getMaterialExtractions(Number(id));
          setExtractions(exts);
        }
      } catch {
        // ignore
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [parsing, id]);

  const handleParse = async () => {
    if (!id) return;
    setParsing(true);
    setParseError('');
    try {
      await parseMaterial(Number(id));
      // Reload after parse completes
      const [mat, exts] = await Promise.all([
        getMaterial(Number(id)),
        getMaterialExtractions(Number(id)),
      ]);
      setMaterial(mat);
      setExtractions(exts);
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : '解析失败');
    } finally {
      setParsing(false);
    }
  };

  const handleToggleMastery = async (extId: number, mastered: boolean) => {
    try {
      const updated = await updateMastery(extId, mastered);
      setExtractions((prev) =>
        prev.map((e) => (e.id === extId ? { ...e, mastered: updated.mastered } : e)),
      );
    } catch {
      // ignore
    }
  };

  const handleDeleteExtraction = async (extId: number) => {
    try {
      await deleteExtraction(extId);
      setExtractions((prev) => prev.filter((e) => e.id !== extId));
    } catch {
      // ignore
    }
  };

  const handleDeleteMaterial = async () => {
    if (!id) return;
    if (!window.confirm('确定要删除这篇材料吗？所有摘录也会一起删除。')) return;
    try {
      await deleteMaterial(Number(id));
      navigate('/');
    } catch {
      // ignore
    }
  };

  const handleTranslate = async () => {
    if (translations) {
      setShowTranslation((v) => !v);
      return;
    }
    if (!id || translating) return;
    setTranslating(true);
    setShowTranslation(true);
    try {
      const res = await translateMaterial(Number(id));
      setTranslations(res.translations);
    } catch {
      setShowTranslation(false);
    } finally {
      setTranslating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="font-mono text-xs uppercase tracking-[2px] text-text-quaternary">加载中...</p>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="text-center py-20">
        <p className="text-text-tertiary">材料不存在</p>
      </div>
    );
  }

  const filteredExtractions =
    typeFilter === 'all'
      ? extractions
      : extractions.filter((e) => e.type === typeFilter);

  return (
    <div>
      {/* Header */}
      <Link
        to="/"
        className="font-mono text-xs uppercase tracking-[2px] text-text-tertiary hover:text-text-primary transition-colors"
      >
        ← 返回材料库
      </Link>

      <div className="mt-4 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-mono text-[10px] uppercase tracking-[1.5px] font-medium text-navy border border-navy/30 px-2 py-0.5">
            {TAG_LABELS[material.sourceTag]}
          </span>
        </div>
        <h1 className="font-serif text-2xl text-text-primary">{material.title}</h1>
        <button
          onClick={handleDeleteMaterial}
          className="mt-2 font-mono text-[10px] uppercase tracking-[1px] text-text-quaternary hover:text-red-500 transition-colors"
        >
          删除材料
        </button>
      </div>

      {/* Parse controls */}
      {(material.parseStatus === 'idle' || material.parseStatus === 'error') && (
        <div className="mb-6 border border-border p-4 flex items-center justify-between">
          <div>
            {material.parseStatus === 'error' && (
              <p className="text-xs text-red-600 mb-1">解析失败，请重试</p>
            )}
            <p className="text-sm text-text-secondary">
              点击开始 AI 解析，提取词汇、词组和句子
            </p>
          </div>
          <button
            onClick={handleParse}
            className="font-mono text-xs uppercase tracking-[2px] font-medium px-6 py-2.5 bg-dark text-white border border-dark hover:bg-dark/80 transition-colors"
          >
            开始解析
          </button>
        </div>
      )}

      {parsing && (
        <div className="mb-6 border border-border p-4 text-center">
          <p className="font-mono text-xs uppercase tracking-[2px] text-text-quaternary animate-pulse">
            AI 解析中...
          </p>
        </div>
      )}

      {parseError && (
        <div className="mb-6 border border-red-200 p-4">
          <p className="text-xs text-red-600">{parseError}</p>
          <button
            onClick={handleParse}
            className="mt-2 font-mono text-xs uppercase tracking-[1px] text-navy hover:text-dark transition-colors"
          >
            重新解析
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => setTab('text')}
          className={[
            'font-mono text-xs uppercase tracking-[2px] font-medium px-5 py-3 transition-colors',
            tab === 'text'
              ? 'text-dark border-b-2 border-dark'
              : 'text-text-tertiary hover:text-text-primary',
          ].join(' ')}
        >
          原文
        </button>
        <button
          onClick={() => setTab('extractions')}
          className={[
            'font-mono text-xs uppercase tracking-[2px] font-medium px-5 py-3 transition-colors',
            tab === 'extractions'
              ? 'text-dark border-b-2 border-dark'
              : 'text-text-tertiary hover:text-text-primary',
          ].join(' ')}
        >
          摘录 ({extractions.length})
        </button>
      </div>

      {/* Tab content */}
      {tab === 'text' ? (
        <div>
          <div ref={textContainerRef} className="text-sm text-text-primary leading-relaxed relative">
            <SelectionPopup materialId={Number(id)} containerRef={textContainerRef} onAdded={loadData} />
            {(() => {
              const paragraphs = material.content.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
              return paragraphs.map((para, i) => (
                <div key={i} className="mb-4">
                  <p className="whitespace-pre-wrap">
                    {extractions.length > 0 ? highlightText(para, extractions) : para}
                  </p>
                  {showTranslation && (
                    <p className="mt-1 text-text-tertiary text-xs leading-relaxed italic">
                      {translations ? translations[i] ?? '' : (translating ? '...' : '')}
                    </p>
                  )}
                </div>
              ));
            })()}
          </div>
          <button
            onClick={handleTranslate}
            disabled={translating}
            className="mt-4 font-mono text-[10px] uppercase tracking-[1.5px] font-medium px-4 py-2 border border-border text-text-secondary hover:text-text-primary transition-colors disabled:opacity-70"
          >
            {translating ? '翻译中...' : showTranslation ? '关闭翻译' : '开启翻译'}
          </button>
        </div>
      ) : (
        <div>
          {/* Type filter */}
          <div className="flex gap-0 mb-6">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={[
                  'px-4 py-2 font-mono text-[10px] uppercase tracking-[1.5px] font-medium border border-border transition-colors',
                  typeFilter === f.value
                    ? 'bg-dark text-white border-dark'
                    : 'text-text-secondary hover:text-text-primary',
                ].join(' ')}
                style={{ marginLeft: f.value === 'all' ? 0 : '-1px' }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredExtractions.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-8">暂无摘录</p>
          ) : (
            <div className="space-y-4">
              {filteredExtractions.map((ext) => (
                <ExtractionCard
                  key={ext.id}
                  extraction={ext}
                  onToggleMastery={handleToggleMastery}
                  onDelete={handleDeleteExtraction}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
