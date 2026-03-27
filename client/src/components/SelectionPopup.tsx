import { useState, useEffect, useRef } from 'react';
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseUp = () => {
      requestAnimationFrame(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();
        if (text && text.length > 0 && !saving) {
          const range = selection!.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          setPos({
            x: rect.left + rect.width / 2 - containerRect.left,
            y: rect.top - containerRect.top - 8,
          });
          setSelectedText(text);
          setShow(true);
        }
      });
    };

    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchend', handleMouseUp);
    return () => {
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchend', handleMouseUp);
    };
  }, [containerRef, saving]);

  useEffect(() => {
    if (!show || saving) return;
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 100);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handleClick); };
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
