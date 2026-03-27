import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Material } from '../../../shared/types';
import { getMaterials } from '../api';

const TAG_LABELS: Record<string, string> = {
  vlog: 'VLOG',
  article: 'ARTICLE',
  podcast: 'PODCAST',
  other: 'OTHER',
};

export default function MaterialLibrary() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMaterials()
      .then(setMaterials)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="font-mono text-xs uppercase tracking-[2px] text-text-quaternary">
          加载中...
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-2xl text-text-primary">材料库</h1>
        <Link
          to="/materials/new"
          className="font-mono text-xs uppercase tracking-[2px] font-medium px-6 py-2.5 bg-dark text-white border border-dark hover:bg-dark/80 transition-colors"
        >
          添加新材料
        </Link>
      </div>

      {materials.length === 0 ? (
        <div className="border border-border p-12 text-center">
          <p className="font-serif text-lg text-text-tertiary italic mb-4">
            还没有任何材料
          </p>
          <Link
            to="/materials/new"
            className="font-mono text-xs uppercase tracking-[2px] font-medium text-navy hover:text-dark transition-colors"
          >
            添加第一篇材料 →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
          {materials.map((mat) => (
            <Link
              key={mat.id}
              to={`/materials/${mat.id}`}
              className="block border border-border p-5 hover:bg-white/50 transition-colors"
              style={{ marginTop: '-1px', marginLeft: '-1px' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="font-mono text-[10px] uppercase tracking-[1.5px] font-medium text-navy">
                  {TAG_LABELS[mat.sourceTag] || mat.sourceTag}
                </span>
                <span className="font-mono text-[10px] text-text-quaternary tracking-[1px]">
                  {mat.parseStatus === 'done' ? '已解析' : mat.parseStatus === 'parsing' ? '解析中' : ''}
                </span>
              </div>
              <h2 className="font-serif text-lg text-text-primary mb-2 line-clamp-2 min-h-[3.5rem]">
                {mat.title}
              </h2>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-text-quaternary uppercase tracking-[1px]">
                  {mat.extractionCount ?? 0} 条摘录
                </span>
                <span className="font-mono text-[10px] text-text-quaternary tracking-[1px]">
                  {new Date(mat.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
