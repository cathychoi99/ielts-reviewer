import { useState, useEffect, useCallback } from 'react';
import type { ExtractionType } from '../../../shared/types';
import { createExtraction } from '../api';

interface Props {
  materialId: number;
  onAdded?: () => void;
}

const TYPE_OPTIONS: { value: ExtractionType; label: string }[] = [
  { value: 'vocabulary', label: '词汇' },
  { value: 'collocation', label: '词组' },
  { value: 'sentence', label: '句子' },
];

export default function SelectionPopup({ materialId, onAdded }: Props) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length > 0) {
      const range = selection!.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.top - 10 });
      setSelectedText(text);
      setShow(true);
      setShowTypeMenu(false);
    } else {
      setShow(false);
    }
  }, []);

  const handleMouseDown = useCallback(() => {
    // Small delay to not interfere with the popup click
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim().length === 0) {
        setShow(false);
      }
    }, 200);
  }, []);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [handleMouseUp, handleMouseDown]);

  const handleAddAs = async (type: ExtractionType) => {
    setSaving(true);
    try {
      let data: Record<string, string>;
      if (type === 'vocabulary') {
        data = { word: selectedText, definition: '', partOfSpeech: '', example: '' };
      } else if (type === 'collocation') {
        data = { phrase: selectedText, definition: '', example: '' };
      } else {
        data = { sentence: selectedText, analysis: '', scenario: '' };
      }
      await createExtraction({ materialId, type, data, priority: 'medium' });
      setShow(false);
      window.getSelection()?.removeAllRanges();
      onAdded?.();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed z-50"
      style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)' }}
    >
      {!showTypeMenu ? (
        <button
          onClick={(e) => { e.stopPropagation(); setShowTypeMenu(true); }}
          className="bg-dark text-white font-mono text-[10px] uppercase tracking-[1.5px] font-medium px-4 py-2 shadow-lg whitespace-nowrap"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
        >
          + 添加到摘录
        </button>
      ) : (
        <div
          className="bg-white border border-border flex flex-col"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
        >
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={(e) => { e.stopPropagation(); handleAddAs(opt.value); }}
              disabled={saving}
              className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-[1.5px] font-medium text-text-secondary hover:bg-page hover:text-dark transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {saving ? '...' : `添加为${opt.label}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
