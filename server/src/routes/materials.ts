import { Router } from 'express';
import { query, queryOne } from '../db.js';
import { parseContent } from '../ai-service.js';
import { Parser } from '../parser.js';
import type { SourceTag, BandLevel, Material, MaterialDetail, Extraction, ExtractionType } from '../../../shared/types.js';

const router = Router();
const VALID_SOURCE_TAGS: SourceTag[] = ['vlog', 'article', 'podcast', 'other'];
const VALID_TYPES: ExtractionType[] = ['vocabulary', 'collocation', 'sentence'];

router.post('/', async (req, res) => {
  try {
    const { title, sourceTag, content } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length === 0) return res.status(400).json({ error: '标题不能为空' });
    if (!content || typeof content !== 'string' || content.trim().length === 0) return res.status(400).json({ error: '内容不能为空' });
    if (!VALID_SOURCE_TAGS.includes(sourceTag)) return res.status(400).json({ error: '无效的来源标签' });

    const result = await query(
      'INSERT INTO materials (title, source_tag, content, parse_status) VALUES (?, ?, ?, ?)',
      title.trim(), sourceTag, content, 'parsing'
    );
    const row = await queryOne('SELECT * FROM materials WHERE id = ?', result.lastInsertRowid);
    const matId = (row as any).id;

    // Auto-parse in background
    (async () => {
      try {
        const settings = await queryOne('SELECT band_level, api_key, api_base_url FROM settings WHERE id = 1');
        if (!(settings as any)?.api_key) {
          await query('UPDATE materials SET parse_status = ? WHERE id = ?', 'idle', matId);
          return;
        }
        const rawResponse = await parseContent(
          content, (settings as any).band_level as BandLevel,
          (settings as any).api_key, (settings as any).api_base_url,
        );
        const extractions = Parser.parse(rawResponse);
        for (const ext of extractions) {
          await query(
            'INSERT INTO extractions (material_id, type, data, priority, mastered) VALUES (?, ?, ?, ?, ?)',
            matId, ext.type, JSON.stringify(ext.data), ext.priority, ext.mastered ? 1 : 0,
          );
        }
        await query('UPDATE materials SET parse_status = ? WHERE id = ?', 'done', matId);
      } catch {
        await query('UPDATE materials SET parse_status = ? WHERE id = ?', 'error', matId).catch(() => {});
      }
    })();

    return res.status(201).json({
      id: matId, title: (row as any).title, sourceTag: (row as any).source_tag,
      content: (row as any).content, parseStatus: 'parsing', createdAt: (row as any).created_at,
    });
  } catch { return res.status(500).json({ error: '服务器内部错误' }); }
});

router.get('/', async (_req, res) => {
  try {
    const result = await query(`
      SELECT m.*, COUNT(e.id) as extraction_count FROM materials m
      LEFT JOIN extractions e ON e.material_id = m.id GROUP BY m.id ORDER BY m.created_at DESC
    `);
    const materials = result.rows.map((r: any) => ({
      id: r.id, title: r.title, sourceTag: r.source_tag,
      parseStatus: r.parse_status, createdAt: r.created_at, extractionCount: r.extraction_count,
    }));
    return res.json(materials);
  } catch { return res.status(500).json({ error: '服务器内部错误' }); }
});

router.get('/:id/extractions', async (req, res) => {
  try {
    const mat = await queryOne('SELECT id FROM materials WHERE id = ?', req.params.id);
    if (!mat) return res.status(404).json({ error: '资源不存在' });

    let sql = 'SELECT * FROM extractions WHERE material_id = ?';
    const params: unknown[] = [req.params.id];
    const { type } = req.query;
    if (type && VALID_TYPES.includes(type as ExtractionType)) { sql += ' AND type = ?'; params.push(type); }
    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, ...params);
    const extractions = result.rows.map((r: any) => ({
      id: r.id, materialId: r.material_id, type: r.type,
      data: JSON.parse(r.data), priority: r.priority, mastered: r.mastered === 1, createdAt: r.created_at,
    }));
    return res.json(extractions);
  } catch { return res.status(500).json({ error: '服务器内部错误' }); }
});

router.post('/:id/parse', async (req, res) => {
  try {
    const mat = await queryOne('SELECT * FROM materials WHERE id = ?', req.params.id);
    if (!mat) return res.status(404).json({ error: '资源不存在' });

    const settings = await queryOne('SELECT band_level, api_key, api_base_url FROM settings WHERE id = 1');
    await query('UPDATE materials SET parse_status = ? WHERE id = ?', 'parsing', (mat as any).id);

    try {
      const rawResponse = await parseContent(
        (mat as any).content, (settings as any).band_level as BandLevel,
        (settings as any).api_key, (settings as any).api_base_url,
      );
      const extractions = Parser.parse(rawResponse);
      await query('DELETE FROM extractions WHERE material_id = ?', (mat as any).id);
      for (const ext of extractions) {
        await query(
          'INSERT INTO extractions (material_id, type, data, priority, mastered) VALUES (?, ?, ?, ?, ?)',
          (mat as any).id, ext.type, JSON.stringify(ext.data), ext.priority, ext.mastered ? 1 : 0,
        );
      }
      await query('UPDATE materials SET parse_status = ? WHERE id = ?', 'done', (mat as any).id);
      return res.json({ message: '解析完成', extractionCount: extractions.length });
    } catch (err) {
      await query('UPDATE materials SET parse_status = ? WHERE id = ?', 'error', (mat as any).id);
      const statusCode = (err as any).statusCode;
      if (statusCode === 422) return res.status(422).json({ error: (err as Error).message });
      if (statusCode === 502) return res.status(502).json({ error: (err as Error).message });
      return res.status(502).json({ error: 'AI 返回数据格式异常' });
    }
  } catch { return res.status(500).json({ error: '服务器内部错误' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await queryOne('SELECT * FROM materials WHERE id = ?', req.params.id);
    if (!row) return res.status(404).json({ error: '资源不存在' });
    const count = await queryOne('SELECT COUNT(*) as count FROM extractions WHERE material_id = ?', req.params.id);
    return res.json({
      id: (row as any).id, title: (row as any).title, sourceTag: (row as any).source_tag,
      content: (row as any).content, parseStatus: (row as any).parse_status,
      createdAt: (row as any).created_at, extractionCount: (count as any).count,
    });
  } catch { return res.status(500).json({ error: '服务器内部错误' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const row = await queryOne('SELECT id FROM materials WHERE id = ?', req.params.id);
    if (!row) return res.status(404).json({ error: '资源不存在' });
    await query('DELETE FROM extractions WHERE material_id = ?', req.params.id);
    await query('DELETE FROM materials WHERE id = ?', req.params.id);
    return res.status(204).send();
  } catch { return res.status(500).json({ error: '服务器内部错误' }); }
});

export default router;
