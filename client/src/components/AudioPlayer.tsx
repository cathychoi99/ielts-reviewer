import { useState, useRef, useCallback, useEffect } from 'react';

interface Props {
  text: string;
}

export default function AudioPlayer({ text }: Props) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const charIndexRef = useRef(0);

  // Estimate total duration: ~150 words/min for English
  const estimateDuration = useCallback(() => {
    const words = text.split(/\s+/).length;
    return (words / 150) * 60; // seconds
  }, [text]);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== undefined) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const total = estimateDuration();
      setCurrentTime(Math.min(elapsed, total));
      setProgress(Math.min((elapsed / total) * 100, 100));
    }, 200);
  }, [estimateDuration, stopTimer]);

  const handlePlay = useCallback(() => {
    if (playing) {
      // Pause
      speechSynthesis.cancel();
      stopTimer();
      setPlaying(false);
      return;
    }

    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = 0.9;

    // Try to pick a good English female voice
    const voices = speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'),
    ) || voices.find(
      (v) => v.lang.startsWith('en-US') && v.name.toLowerCase().includes('samantha'),
    ) || voices.find(
      (v) => v.lang.startsWith('en') && /samantha|karen|victoria|zira|hazel/i.test(v.name),
    ) || voices.find((v) => v.lang.startsWith('en-US'));
    if (preferred) utter.voice = preferred;

    const total = estimateDuration();
    setTotalTime(total);

    utter.onstart = () => {
      startTimeRef.current = Date.now();
      startTimer();
    };
    utter.onboundary = (e) => {
      charIndexRef.current = e.charIndex;
      const pct = (e.charIndex / text.length) * 100;
      setProgress(pct);
    };
    utter.onend = () => {
      stopTimer();
      setPlaying(false);
      setProgress(100);
      setCurrentTime(total);
    };
    utter.onerror = () => {
      stopTimer();
      setPlaying(false);
    };

    utterRef.current = utter;
    speechSynthesis.speak(utter);
    setPlaying(true);
    setTotalTime(total);
  }, [playing, text, estimateDuration, startTimer, stopTimer]);

  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
      stopTimer();
    };
  }, [stopTimer]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const total = totalTime || estimateDuration();

  return (
    <div className="flex items-center gap-3 py-2">
      <button
        onClick={handlePlay}
        className="font-mono text-[10px] uppercase tracking-[1.5px] font-medium px-3 py-1.5 border border-border text-text-secondary hover:text-text-primary transition-colors shrink-0"
      >
        {playing ? '暂停' : '播放'}
      </button>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-navy transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="font-mono text-[10px] text-text-quaternary tracking-[1px] shrink-0">
          {formatTime(currentTime)} / {formatTime(total)}
        </span>
      </div>
    </div>
  );
}
