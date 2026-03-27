import { Router } from 'express';
import { query, queryOne } from '../db.js';
import type { ExtractionType, SourceTag } from '../../../shared/types.js';

const router = Router();
const VALID_TYPES: ExtractionType[] = ['vocabulary', 'collocation', 'sentence'];
const VALID_SOURCE_TAGS: SourceTag[] = ['vlog', 'article', 'podcast', 'other'];

function mapRow(r: any) {
  return {
    id: r.id, materialId: r.material_id, type: r.type,
    data: JSON.parse(r.data), priority: r.priority,
    mastered: r.mastered === 1, createdAt: r.created_at,
    ...(r.material_title !== undefined ? { materialTitle: r.material_title } : {}),
  };
}

router.get('/review', async (req, res) => {
  try {
    let sql = 'SELECT e.*, m.title as material_title FROM extractions e JOIN materials m ON m.id = e.material_id WHERE e.mastered = 0';
    const params: unknown[] = [];
    const { materialId, type } = req.query;
    if (materialId) { sql += ' AND e.material_id = ?'; params.push(Number(materialId)); }
    if (type && VALID_TYPES.includes(type as ExtractionType)) { sql += ' AND e.type = ?'; params.push(type); }
    sql += ' ORDER BY RANDOM()';
    const result = await query(sql, ...params);
    return res.json(result.rows.map(mapRow));
  } catch { return res.status(500).json({ error: '服务器内部错误' }); }
});

router.get('/', async (req, res) => {
  try {
    let sql = 'SELECT e.*, m.title as material_title FROM extractions e JOIN materials m ON m.id = e.material_id';
    const conditions: string[] = [];
    const params: unknown[] = [];
    const { type, mastery, sourceTag } = req.query;
    if (type && VALID_TYPES.includes(type as ExtractionType)) { conditions.push('e.type = ?'); params.push(type); }
    if (mastery === 'mastered') conditions.push('e.mastered = 1');
    else if (mastery === 'unmastered') conditions.push('e.mastered = 0');
    if (sourceTag && VALID_SOURCE_TAGS.includes(sourceTag as SourceTag)) { conditions.push('m.source_tag = ?'); params.push(sourceTag); }
    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY e.created_at DESC';
    const result = await query(sql, ...params);
    return res.json(result.rows.map(mapRow));
  } catch { return res.status(500).json({ error: '服务器内部错误' }); }
});

router.patch('/:id/mastery', async (req, res) => {
  try {
    const { mastered } = req.body;
    if (typeof mastered !== 'boolean') return res.status(400).json({ error: 'mastered 字段必须为布尔值' });
    const row = await queryOne('SELECT * FROM extractions WHERE id = ?', req.params.id);
    if (!row) return res.status(404).json({ error: '资源不存在' });
    await query('UPDATE extractions SET mastered = ? WHERE id = ?', mastered ? 1 : 0, req.params.id);
    const updated = await queryOne('SELECT * FROM extractions WHERE id = ?', req.params.id);
    return res.json(mapRow(updated));
  } catch { return res.status(500).json({ error: '服务器内部错误' }); }
});

export default router;
