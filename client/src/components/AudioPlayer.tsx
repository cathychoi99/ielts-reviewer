import { useState, useRef, useCallback, useEffect } from 'react';

interface Props {
  text: string;
}

// Split text into chunks at sentence boundaries, max ~800 chars each
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
  const [totalTime, setTotalTime] = useState(0);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const chunkIndexRef = useRef(0);
  const chunksRef = useRef<string[]>([]);
  const cancelledRef = useRef(false);

  const estimateDuration = useCallback(() => {
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
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const total = estimateDuration();
      setCurrentTime(Math.min(elapsed, total));
      setProgress(Math.min((elapsed / total) * 100, 100));
    }, 200);
  }, [estimateDuration, stopTimer]);

  const speakChunk = useCallback((chunks: string[], index: number, voice: SpeechSynthesisVoice | undefined) => {
    if (cancelledRef.current || index >= chunks.length) {
      stopTimer();
      setPlaying(false);
      if (!cancelledRef.current) {
        const total = estimateDuration();
        setProgress(100);
        setCurrentTime(total);
      }
      return;
    }
    const utter = new SpeechSynthesisUtterance(chunks[index]);
    utter.lang = 'en-US';
    utter.rate = 1;
    if (voice) utter.voice = voice;

    utter.onend = () => {
      chunkIndexRef.current = index + 1;
      speakChunk(chunks, index + 1, voice);
    };
    utter.onerror = () => {
      stopTimer();
      setPlaying(false);
    };

    speechSynthesis.speak(utter);
  }, [estimateDuration, stopTimer]);

  const handlePlay = useCallback(() => {
    if (playing) {
      cancelledRef.current = true;
      speechSynthesis.cancel();
      stopTimer();
      setPlaying(false);
      return;
    }

    speechSynthesis.cancel();
    cancelledRef.current = false;
    const chunks = splitIntoChunks(text);
    chunksRef.current = chunks;
    chunkIndexRef.current = 0;

    const total = estimateDuration();
    setTotalTime(total);
    startTimeRef.current = Date.now();
    startTimer();
    setPlaying(true);

    const voice = getEnglishVoice();
    speakChunk(chunks, 0, voice);
  }, [playing, text, estimateDuration, startTimer, stopTimer, speakChunk]);

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
