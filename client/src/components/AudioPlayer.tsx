import { useState, useRef, useCallback, useEffect } from 'react';

interface Props {
  text: string;
}

function splitIntoChunks(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) || [text];
  const chunks: string[] = [];
  let current = '';
  for (const s of sentences) {
    if (current.length + s.length > 800 && current.length > 0) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function getEnglishVoice(): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.startsWith('en') && /samantha|karen|victoria|zira|hazel/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
    voices.find((v) => v.lang.startsWith('en-US'))
  );
}

export default function AudioPlayer({ text }: Props) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const startTimeRef = useRef(0);
  const timeOffsetRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const chunksRef = useRef<string[]>([]);
  const cancelledRef = useRef(false);
  const barRef = useRef<HTMLDivElement>(null);

  const totalDuration = useCallback(() => {
    const words = text.split(/\s+/).length;
    return (words / 150) * 60;
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
      const elapsed = timeOffsetRef.current + (Date.now() - startTimeRef.current) / 1000;
      const total = totalDuration();
      setCurrentTime(Math.min(elapsed, total));
      setProgress(Math.min((elapsed / total) * 100, 100));
    }, 200);
  }, [totalDuration, stopTimer]);

  const speakChunk = useCallback((chunks: string[], index: number, voice: SpeechSynthesisVoice | undefined) => {
    if (cancelledRef.current || index >= chunks.length) {
      stopTimer();
      setPlaying(false);
      if (!cancelledRef.current) {
        setProgress(100);
        setCurrentTime(totalDuration());
      }
      return;
    }
    const utter = new SpeechSynthesisUtterance(chunks[index]);
    utter.lang = 'en-US';
    utter.rate = 1;
    if (voice) utter.voice = voice;
    utter.onend = () => speakChunk(chunks, index + 1, voice);
    utter.onerror = () => { stopTimer(); setPlaying(false); };
    speechSynthesis.speak(utter);
  }, [totalDuration, stopTimer]);

  // Get chunk index and time offset for a given progress percentage
  const getChunkForProgress = useCallback((pct: number) => {
    const chunks = chunksRef.current.length > 0 ? chunksRef.current : splitIntoChunks(text);
    const totalChars = chunks.reduce((s, c) => s + c.length, 0);
    const targetChar = (pct / 100) * totalChars;
    let acc = 0;
    for (let i = 0; i < chunks.length; i++) {
      if (acc + chunks[i].length >= targetChar) return { index: i, chunks };
      acc += chunks[i].length;
    }
    return { index: chunks.length - 1, chunks };
  }, [text]);

  const startFromChunk = useCallback((chunks: string[], index: number, pct: number) => {
    speechSynthesis.cancel();
    cancelledRef.current = false;
    chunksRef.current = chunks;
    const total = totalDuration();
    const seekTime = (pct / 100) * total;
    timeOffsetRef.current = seekTime;
    startTimeRef.current = Date.now();
    setCurrentTime(seekTime);
    setProgress(pct);
    startTimer();
    setPlaying(true);
    const voice = getEnglishVoice();
    speakChunk(chunks, index, voice);
  }, [totalDuration, startTimer, speakChunk]);

  const handlePlay = useCallback(() => {
    if (playing) {
      cancelledRef.current = true;
      speechSynthesis.cancel();
      stopTimer();
      setPlaying(false);
      return;
    }
    const chunks = splitIntoChunks(text);
    startFromChunk(chunks, 0, 0);
  }, [playing, text, stopTimer, startFromChunk]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const { index, chunks } = getChunkForProgress(pct);

    if (playing) {
      startFromChunk(chunks, index, pct);
    } else {
      // Just update position, will start from here on next play
      const total = totalDuration();
      setProgress(pct);
      setCurrentTime((pct / 100) * total);
      chunksRef.current = chunks;
      // Auto-play from seek position
      startFromChunk(chunks, index, pct);
    }
  }, [playing, getChunkForProgress, startFromChunk, totalDuration]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      speechSynthesis.cancel();
      stopTimer();
    };
  }, [stopTimer]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const total = totalDuration();

  return (
    <div className="flex items-center gap-3 py-2">
      <button
        onClick={handlePlay}
        className="font-mono text-[10px] uppercase tracking-[1.5px] font-medium px-3 py-1.5 border border-border text-text-secondary hover:text-text-primary transition-colors shrink-0"
      >
        {playing ? '暂停' : '播放'}
      </button>
      <div className="flex-1 flex items-center gap-2">
        <div
          ref={barRef}
          className="flex-1 h-2 bg-border rounded-full overflow-hidden cursor-pointer relative"
          onClick={handleSeek}
          onTouchStart={handleSeek}
        >
          <div
            className="h-full bg-navy rounded-full transition-all duration-200"
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
