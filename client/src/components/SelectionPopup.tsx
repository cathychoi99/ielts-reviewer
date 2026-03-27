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

  const updatePopup = useCallback(() => {
    const container = containerRef.current;
    if (!container || saving) return;
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text || !selection?.rangeCount) {
      setShow(false);
      return;
    }
    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) return;

    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setPos({
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.bottom - containerRect.top + 8,
    });
    setSelectedText(text);
    setShow(true);
  }, [containerRef, saving]);

  // Desktop: mouseup
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handle = () => requestAnimationFrame(updatePopup);
    container.addEventListener('mouseup', handle);
    return () => container.removeEventListener('mouseup', handle);
  }, [containerRef, updatePopup]);

  // Mobile: selectionchange — only update position, don't hide during active selection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let timer: ReturnType<typeof setTimeout>;
    const handle = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();
        if (!text || !selection?.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (container.contains(range.commonAncestorContainer)) {
          updatePopup();
        }
      }, 200);
    };
    document.addEventListener('selectionchange', handle);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('selectionchange', handle);
    };
  }, [containerRef, updatePopup]);

  // Dismiss when selection is cleared (separate check)
  useEffect(() => {
    if (!show) return;
    let timer: ReturnType<typeof setTimeout>;
    const checkClear = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const text = window.getSelection()?.toString().trim();
        if (!text) setShow(false);
      }, 400);
    };
    document.addEventListener('selectionchange', checkClear);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('selectionchange', checkClear);
    };
  }, [show]);

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
    }, 200);
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
      style={{ left: pos.x, top: pos.y, transform: 'translateX(-50%)' }}
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
