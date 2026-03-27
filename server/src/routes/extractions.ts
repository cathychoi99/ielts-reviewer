import { Router } from 'express';
import { getDatabase } from '../db.js';
import type { Extraction, ExtractionType, SourceTag } from '../../../shared/types.js';

const router = Router();

const VALID_TYPES: ExtractionType[] = ['vocabulary', 'collocation', 'sentence'];
const VALID_SOURCE_TAGS: SourceTag[] = ['vlog', 'article', 'podcast', 'other'];

function mapExtractionRow(row: {
  id: number;
  material_id: number;
  type: string;
  data: string;
  priority: string;
  mastered: number;
  created_at: string;
  material_title?: string;
}): Extraction {
  return {
    id: row.id,
    materialId: row.material_id,
    type: row.type as ExtractionType,
    data: JSON.parse(row.data),
    priority: row.priority as Extraction['priority'],
    mastered: row.mastered === 1,
    createdAt: row.created_at,
    ...(row.material_title !== undefined ? { materialTitle: row.material_title } : {}),
  };
}

// GET /api/extractions/review — must be before /:id routes
router.get('/review', (req, res) => {
  try {
    const db = getDatabase();
    const conditions: string[] = ['e.mastered = 0'];
    const params: unknown[] = [];

    const { materialId, type } = req.query;

    if (materialId) {
      conditions.push('e.material_id = ?');
      params.push(Number(materialId));
    }
    if (type && VALID_TYPES.includes(type as ExtractionType)) {
      conditions.push('e.type = ?');
      params.push(type);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = db.prepare(`
      SELECT e.*, m.title as material_title
      FROM extractions e
      JOIN materials m ON m.id = e.material_id
      ${where}
      ORDER BY RANDOM()
    `).all(...params) as Array<{
      id: number;
      material_id: number;
      type: string;
      data: string;
      priority: string;
      mastered: number;
      created_at: string;
      material_title: string;
    }>;

    return res.json(rows.map(mapExtractionRow));
  } catch {
    return res.status(500).json({ error: '服务器内部错误' });
  }
});


// GET /api/extractions
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const conditions: string[] = [];
    const params: unknown[] = [];

    const { type, mastery, sourceTag } = req.query;

    if (type && VALID_TYPES.includes(type as ExtractionType)) {
      conditions.push('e.type = ?');
      params.push(type);
    }
    if (mastery === 'mastered') {
      conditions.push('e.mastered = 1');
    } else if (mastery === 'unmastered') {
      conditions.push('e.mastered = 0');
    }
    if (sourceTag && VALID_SOURCE_TAGS.includes(sourceTag as SourceTag)) {
      conditions.push('m.source_tag = ?');
      params.push(sourceTag);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = db.prepare(`
      SELECT e.*, m.title as material_title
      FROM extractions e
      JOIN materials m ON m.id = e.material_id
      ${where}
      ORDER BY e.created_at DESC
    `).all(...params) as Array<{
      id: number;
      material_id: number;
      type: string;
      data: string;
      priority: string;
      mastered: number;
      created_at: string;
      material_title: string;
    }>;

    return res.json(rows.map(mapExtractionRow));
  } catch {
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

// PATCH /api/extractions/:id/mastery
router.patch('/:id/mastery', (req, res) => {
  try {
    const db = getDatabase();
    const { mastered } = req.body;

    if (typeof mastered !== 'boolean') {
      return res.status(400).json({ error: 'mastered 字段必须为布尔值' });
    }

    const row = db.prepare('SELECT * FROM extractions WHERE id = ?').get(req.params.id) as {
      id: number;
      material_id: number;
      type: string;
      data: string;
      priority: string;
      mastered: number;
      created_at: string;
    } | undefined;

    if (!row) {
      return res.status(404).json({ error: '资源不存在' });
    }

    db.prepare('UPDATE extractions SET mastered = ? WHERE id = ?').run(mastered ? 1 : 0, req.params.id);

    const updated = db.prepare('SELECT * FROM extractions WHERE id = ?').get(req.params.id) as {
      id: number;
      material_id: number;
      type: string;
      data: string;
      priority: string;
      mastered: number;
      created_at: string;
    };

    return res.json(mapExtractionRow(updated));
  } catch {
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
