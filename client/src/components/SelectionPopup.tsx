import { useState, useEffect, useRef, useCallback } from 'react';
import { createExtraction } from '../api';

interface Props {
  materialId: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onAdded?: () => void;
}

export default function SelectionPopup({ materialId, containerRef, onAdded }: Props) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [saving, setSaving] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const tryShowPopup = useCallback(() => {
    const container = containerRef.current;
    if (!container || saving) return;
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text || text.length === 0) {
      setShow(false);
      return;
    }
    // Make sure selection is inside our container
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) return;

    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setPos({
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top - containerRect.top - 8,
    });
    setSelectedText(text);
    setShow(true);
  }, [containerRef, saving]);

  // Desktop: mouseup
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleMouseUp = () => requestAnimationFrame(tryShowPopup);
    container.addEventListener('mouseup', handleMouseUp);
    return () => container.removeEventListener('mouseup', handleMouseUp);
  }, [containerRef, tryShowPopup]);

  // Mobile: selectionchange fires when user adjusts selection handles
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let debounceTimer: ReturnType<typeof setTimeout>;
    const handleSelectionChange = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();
        if (!text || !selection?.rangeCount) {
          setShow(false);
          return;
        }
        const range = selection.getRangeAt(0);
        if (container.contains(range.commonAncestorContainer)) {
          tryShowPopup();
        }
      }, 300);
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      clearTimeout(debounceTimer);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [containerRef, tryShowPopup]);

  // Dismiss on outside click/touch
  useEffect(() => {
    if (!show || saving) return;
    const handleDismiss = (e: MouseEvent | TouchEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleDismiss);
      document.addEventListener('touchstart', handleDismiss);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleDismiss);
      document.removeEventListener('touchstart', handleDismiss);
    };
  }, [show, saving]);

  const handleAdd = async () => {
    setSaving(true);
    try {
      await createExtraction({ materialId, text: selectedText });
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
      ref={popupRef}
      className="absolute z-50"
      style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)' }}
    >
      <button
        onMouseDown={(e) => e.preventDefault()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={handleAdd}
        disabled={saving}
        className="bg-dark text-white font-mono text-[10px] uppercase tracking-[1.5px] font-medium px-4 py-2 whitespace-nowrap disabled:opacity-70"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
      >
        {saving ? 'AI 分析中...' : '+ 添加到摘录'}
      </button>
    </div>
  );
}
