import { Router } from 'express';
import { getDatabase } from '../db.js';
import { parseContent } from '../ai-service.js';
import { Parser } from '../parser.js';
import type { SourceTag, BandLevel, Material, MaterialDetail, Extraction, ExtractionType } from '../../../shared/types.js';

const router = Router();

const VALID_SOURCE_TAGS: SourceTag[] = ['vlog', 'article', 'podcast', 'other'];
const VALID_TYPES: ExtractionType[] = ['vocabulary', 'collocation', 'sentence'];

// POST /api/materials
router.post('/', (req, res) => {
  try {
    const { title, sourceTag, content } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: '标题不能为空' });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: '内容不能为空' });
    }
    if (!VALID_SOURCE_TAGS.includes(sourceTag)) {
      return res.status(400).json({ error: `无效的来源标签，有效值为: ${VALID_SOURCE_TAGS.join(', ')}` });
    }

    const db = getDatabase();
    const result = db.prepare(
      'INSERT INTO materials (title, source_tag, content, parse_status) VALUES (?, ?, ?, ?)'
    ).run(title.trim(), sourceTag, content, 'idle');

    const row = db.prepare('SELECT * FROM materials WHERE id = ?').get(result.lastInsertRowid) as {
      id: number;
      title: string;
      source_tag: string;
      content: string;
      parse_status: string;
      created_at: string;
    };

    const material: MaterialDetail = {
      id: row.id,
      title: row.title,
      sourceTag: row.source_tag as SourceTag,
      content: row.content,
      parseStatus: row.parse_status as MaterialDetail['parseStatus'],
      createdAt: row.created_at,
    };

    return res.status(201).json(material);
  } catch {
    return res.status(500).json({ error: '服务器内部错误' });
  }
});


// GET /api/materials
router.get('/', (_req, res) => {
  try {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT m.*, COUNT(e.id) as extraction_count
      FROM materials m
      LEFT JOIN extractions e ON e.material_id = m.id
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `).all() as Array<{
      id: number;
      title: string;
      source_tag: string;
      content: string;
      parse_status: string;
      created_at: string;
      extraction_count: number;
    }>;

    const materials: Material[] = rows.map(row => ({
      id: row.id,
      title: row.title,
      sourceTag: row.source_tag as SourceTag,
      parseStatus: row.parse_status as Material['parseStatus'],
      createdAt: row.created_at,
      extractionCount: row.extraction_count,
    }));

    return res.json(materials);
  } catch {
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/materials/:id/extractions — must be before /:id to avoid conflict
router.get('/:id/extractions', (req, res) => {
  try {
    const db = getDatabase();

    const material = db.prepare('SELECT id FROM materials WHERE id = ?').get(req.params.id);
    if (!material) {
      return res.status(404).json({ error: '资源不存在' });
    }

    const conditions: string[] = ['material_id = ?'];
    const params: unknown[] = [req.params.id];

    const { type } = req.query;
    if (type && VALID_TYPES.includes(type as ExtractionType)) {
      conditions.push('type = ?');
      params.push(type);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const rows = db.prepare(`
      SELECT * FROM extractions ${where} ORDER BY created_at DESC
    `).all(...params) as Array<{
      id: number;
      material_id: number;
      type: string;
      data: string;
      priority: string;
      mastered: number;
      created_at: string;
    }>;

    const extractions: Extraction[] = rows.map(row => ({
      id: row.id,
      materialId: row.material_id,
      type: row.type as ExtractionType,
      data: JSON.parse(row.data),
      priority: row.priority as Extraction['priority'],
      mastered: row.mastered === 1,
      createdAt: row.created_at,
    }));

    return res.json(extractions);
  } catch {
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/materials/:id/parse
router.post('/:id/parse', async (req, res) => {
  try {
    const db = getDatabase();
    const materialRow = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id) as {
      id: number;
      title: string;
      source_tag: string;
      content: string;
      parse_status: string;
      created_at: string;
    } | undefined;

    if (!materialRow) {
      return res.status(404).json({ error: '资源不存在' });
    }

    // Get settings for API key and band level
    const settings = db.prepare('SELECT band_level, api_key, api_base_url FROM settings WHERE id = 1').get() as {
      band_level: string;
      api_key: string;
      api_base_url: string;
    };

    // Update status to parsing
    db.prepare('UPDATE materials SET parse_status = ? WHERE id = ?').run('parsing', materialRow.id);

    try {
      const rawResponse = await parseContent(
        materialRow.content,
        settings.band_level as BandLevel,
        settings.api_key,
        settings.api_base_url,
      );

      const extractions = Parser.parse(rawResponse);

      // Clear old extractions (for re-parse)
      db.prepare('DELETE FROM extractions WHERE material_id = ?').run(materialRow.id);

      // Insert new extractions
      const insertStmt = db.prepare(
        'INSERT INTO extractions (material_id, type, data, priority, mastered) VALUES (?, ?, ?, ?, ?)'
      );

      const insertMany = db.transaction((items: typeof extractions) => {
        for (const ext of items) {
          insertStmt.run(
            materialRow.id,
            ext.type,
            JSON.stringify(ext.data),
            ext.priority,
            ext.mastered ? 1 : 0,
          );
        }
      });

      insertMany(extractions);

      // Update status to done
      db.prepare('UPDATE materials SET parse_status = ? WHERE id = ?').run('done', materialRow.id);

      return res.json({ message: '解析完成', extractionCount: extractions.length });
    } catch (err) {
      // On failure, set parse_status to error, don't write extractions
      db.prepare('UPDATE materials SET parse_status = ? WHERE id = ?').run('error', materialRow.id);

      const statusCode = (err as Error & { statusCode?: number }).statusCode;
      if (statusCode === 422) {
        return res.status(422).json({ error: (err as Error).message });
      }
      if (statusCode === 502) {
        return res.status(502).json({ error: (err as Error).message });
      }
      return res.status(502).json({ error: 'AI 返回数据格式异常' });
    }
  } catch {
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/materials/:id
router.get('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id) as {
      id: number;
      title: string;
      source_tag: string;
      content: string;
      parse_status: string;
      created_at: string;
    } | undefined;

    if (!row) {
      return res.status(404).json({ error: '资源不存在' });
    }

    const extractionCount = db.prepare('SELECT COUNT(*) as count FROM extractions WHERE material_id = ?')
      .get(req.params.id) as { count: number };

    const material: MaterialDetail = {
      id: row.id,
      title: row.title,
      sourceTag: row.source_tag as SourceTag,
      content: row.content,
      parseStatus: row.parse_status as MaterialDetail['parseStatus'],
      createdAt: row.created_at,
      extractionCount: extractionCount.count,
    };

    return res.json(material);
  } catch {
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

// DELETE /api/materials/:id
router.delete('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT id FROM materials WHERE id = ?').get(req.params.id);

    if (!row) {
      return res.status(404).json({ error: '资源不存在' });
    }

    // Foreign key ON DELETE CASCADE handles extractions
    db.prepare('DELETE FROM materials WHERE id = ?').run(req.params.id);

    return res.status(204).send();
  } catch {
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
