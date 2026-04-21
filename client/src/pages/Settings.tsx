import { useEffect, useState } from 'react';
import type { BandLevel } from '../../../shared/types';
import { getSettings, updateSettings } from '../api';

const BAND_LEVELS: BandLevel[] = ['5.0', '5.5', '6.0', '6.5', '7+'];

export default function Settings() {
  const [bandLevel, setBandLevel] = useState<BandLevel>('6.0');
  const [apiKey, setApiKey] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('https://api.deepseek.com');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    document.title = '设置 - IELTS Reviewer';
    getSettings()
      .then((s) => {
        setBandLevel(s.bandLevel);
        setApiKey(s.apiKey);
        setApiBaseUrl(s.apiBaseUrl || 'https://api.deepseek.com');
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await updateSettings({ bandLevel, apiKey, apiBaseUrl });
      setMessage('设置已保存');
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="font-serif text-2xl text-text-primary mb-8">Settings</h1>

      {/* Band Level */}
      <section className="mb-8">
        <label className="block font-mono text-xs uppercase tracking-[2px] font-medium text-text-secondary mb-3">
          英语水平 (Band Level)
        </label>
        <div className="flex gap-0">
          {BAND_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => setBandLevel(level)}
              className={[
                'flex-1 py-2.5 font-mono text-xs uppercase tracking-[1px] font-medium border border-border transition-colors',
                bandLevel === level
                  ? 'bg-dark text-white border-dark'
                  : 'bg-transparent text-text-secondary hover:text-text-primary',
              ].join(' ')}
              style={{ marginLeft: level === '5.0' ? 0 : '-1px' }}
            >
              {level}
            </button>
          ))}
        </div>
      </section>

      {/* API Key */}
      <section className="mb-6">
        <label className="block font-mono text-xs uppercase tracking-[2px] font-medium text-text-secondary mb-2">
          AI API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          className="w-full border border-border bg-transparent px-4 py-2.5 text-sm text-text-primary font-mono placeholder:text-text-quaternary focus:outline-none focus:border-dark transition-colors"
        />
      </section>

      {/* API Base URL */}
      <section className="mb-8">
        <label className="block font-mono text-xs uppercase tracking-[2px] font-medium text-text-secondary mb-2">
          API Base URL
        </label>
        <input
          type="text"
          value={apiBaseUrl}
          onChange={(e) => setApiBaseUrl(e.target.value)}
          placeholder="https://api.deepseek.com"
          className="w-full border border-border bg-transparent px-4 py-2.5 text-sm text-text-primary font-mono placeholder:text-text-quaternary focus:outline-none focus:border-dark transition-colors"
        />
      </section>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="font-mono text-xs uppercase tracking-[2px] font-medium px-8 py-3 bg-dark text-white border border-dark hover:bg-dark/80 transition-colors disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存设置'}
      </button>

      {message && (
        <p className="mt-4 font-mono text-xs text-text-tertiary">{message}</p>
      )}
    </div>
  );
}
