import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SourceTag } from '../../../shared/types';
import { createMaterial, parseMaterial } from '../api';
import { isValidFileExtension } from '../utils/validation';

const SOURCE_TAGS: { value: SourceTag; label: string }[] = [
  { value: 'vlog', label: 'Vlog' },
  { value: 'article', label: '文章' },
  { value: 'podcast', label: '播客' },
  { value: 'other', label: '其他' },
];

export default function AddMaterial() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { document.title = '添加材料 - IELTS Reviewer'; }, []);

  const [title, setTitle] = useState('');
  const [sourceTag, setSourceTag] = useState<SourceTag>('article');
  const [content, setContent] = useState('');
  const [tab, setTab] = useState<'paste' | 'upload'>('paste');
  const [errors, setErrors] = useState<{ title?: string; content?: string; file?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e: typeof errors = {};
    if (!title.trim()) e.title = '请输入标题';
    if (!content.trim()) e.content = '请输入或上传内容';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isValidFileExtension(file.name)) {
      setErrors((prev) => ({ ...prev, file: '仅支持 .txt 和 .md 格式的文件' }));
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setErrors((prev) => ({ ...prev, file: undefined }));
    const reader = new FileReader();
    reader.onload = (ev) => {
      setContent((ev.target?.result as string) || '');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const mat = await createMaterial({ title: title.trim(), sourceTag, content: content.trim() });
      // Auto-trigger parsing (fire and forget — detail page will poll status)
      parseMaterial(mat.id).catch(() => {});
      navigate(`/materials/${mat.id}`);
    } catch (e: unknown) {
      setErrors({ content: e instanceof Error ? e.message : '提交失败' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-serif text-2xl text-text-primary mb-8">添加新材料</h1>

      {/* Title */}
      <section className="mb-6">
        <label className="block font-mono text-xs uppercase tracking-[2px] font-medium text-text-secondary mb-2">
          标题
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="材料标题"
          className="w-full border border-border bg-transparent px-4 py-2.5 text-sm text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-dark transition-colors"
        />
        {errors.title && (
          <p className="mt-1 text-xs text-red-600">{errors.title}</p>
        )}
      </section>

      {/* Source Tag */}
      <section className="mb-6">
        <label className="block font-mono text-xs uppercase tracking-[2px] font-medium text-text-secondary mb-2">
          来源标签
        </label>
        <div className="flex gap-0">
          {SOURCE_TAGS.map((tag) => (
            <button
              key={tag.value}
              onClick={() => setSourceTag(tag.value)}
              className={[
                'flex-1 py-2.5 font-mono text-xs uppercase tracking-[1px] font-medium border border-border transition-colors',
                sourceTag === tag.value
                  ? 'bg-dark text-white border-dark'
                  : 'bg-transparent text-text-secondary hover:text-text-primary',
              ].join(' ')}
              style={{ marginLeft: tag.value === 'vlog' ? 0 : '-1px' }}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </section>

      {/* Content tabs */}
      <section className="mb-6">
        <div className="flex border-b border-border mb-4">
          <button
            onClick={() => setTab('paste')}
            className={[
              'font-mono text-xs uppercase tracking-[2px] font-medium px-4 py-2 transition-colors',
              tab === 'paste'
                ? 'text-dark border-b-2 border-dark'
                : 'text-text-tertiary hover:text-text-primary',
            ].join(' ')}
          >
            粘贴文本
          </button>
          <button
            onClick={() => setTab('upload')}
            className={[
              'font-mono text-xs uppercase tracking-[2px] font-medium px-4 py-2 transition-colors',
              tab === 'upload'
                ? 'text-dark border-b-2 border-dark'
                : 'text-text-tertiary hover:text-text-primary',
            ].join(' ')}
          >
            上传文件
          </button>
        </div>

        {tab === 'paste' ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="在此粘贴英语材料内容..."
            rows={12}
            className="w-full border border-border bg-transparent px-4 py-3 text-sm text-text-primary leading-relaxed placeholder:text-text-quaternary focus:outline-none focus:border-dark transition-colors resize-y"
          />
        ) : (
          <div className="border border-border p-6 text-center">
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-block font-mono text-xs uppercase tracking-[2px] font-medium px-6 py-2.5 border border-dark text-dark cursor-pointer hover:bg-dark hover:text-white transition-colors"
            >
              选择文件
            </label>
            <p className="mt-2 font-mono text-[10px] text-text-quaternary uppercase tracking-[1px]">
              支持 .txt 和 .md 格式
            </p>
            {errors.file && (
              <p className="mt-2 text-xs text-red-600">{errors.file}</p>
            )}
            {content && tab === 'upload' && (
              <p className="mt-3 text-xs text-text-tertiary">
                已加载 {content.length} 个字符
              </p>
            )}
          </div>
        )}
        {errors.content && (
          <p className="mt-1 text-xs text-red-600">{errors.content}</p>
        )}
      </section>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="font-mono text-xs uppercase tracking-[2px] font-medium px-8 py-3 bg-dark text-white border border-dark hover:bg-dark/80 transition-colors disabled:opacity-50"
      >
        {submitting ? '提交中...' : '提交材料'}
      </button>
    </div>
  );
}
