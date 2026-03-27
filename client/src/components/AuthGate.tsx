import { useState, useEffect } from 'react';
import { getAccessToken, setAccessToken, verifyPassword } from '../api';

interface Props {
  children: React.ReactNode;
}

export default function AuthGate({ children }: Props) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      // Verify existing token
      verifyPassword(token).then((valid) => {
        if (valid) setAuthed(true);
        setChecking(false);
      });
    } else {
      // Check if server requires auth
      verifyPassword('').then((valid) => {
        if (valid) setAuthed(true); // No password required
        setChecking(false);
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const valid = await verifyPassword(password);
    if (valid) {
      setAccessToken(password);
      setAuthed(true);
    } else {
      setError('密码错误，请重试');
    }
  };

  if (checking) {
    return (
      <div className="min-h-svh bg-page flex items-center justify-center">
        <p className="font-mono text-xs uppercase tracking-[2px] text-text-quaternary">
          加载中...
        </p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-svh bg-page flex items-center justify-center px-6">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <h1 className="font-serif text-3xl text-text-primary mb-2 text-center">
            IELTS Reviewer
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-text-quaternary text-center mb-8">
            ENTER ACCESS PASSWORD
          </p>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="访问密码"
            autoFocus
            className="w-full border border-border bg-transparent px-4 py-3 text-sm text-text-primary font-mono placeholder:text-text-quaternary focus:outline-none focus:border-dark transition-colors mb-4"
          />

          {error && (
            <p className="text-xs text-red-600 mb-4">{error}</p>
          )}

          <button
            type="submit"
            className="w-full font-mono text-xs uppercase tracking-[2px] font-medium py-3 bg-dark text-white border border-dark hover:bg-dark/80 transition-colors"
          >
            进入
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
