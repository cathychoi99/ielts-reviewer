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

// POST /api/extractions — smart extraction: AI auto-detects type and generates details
router.post('/', async (req, res) => {
  try {
    const { materialId, text } = req.body;
    if (!materialId) return res.status(400).json({ error: 'materialId 不能为空' });
    if (!text || typeof text !== 'string' || text.trim().length === 0) return res.status(400).json({ error: 'text 不能为空' });

    const mat = await queryOne('SELECT id FROM materials WHERE id = ?', materialId);
    if (!mat) return res.status(404).json({ error: '材料不存在' });

    // Get AI settings
    const settings = await queryOne('SELECT api_key, api_base_url, band_level FROM settings WHERE id = 1');
    const apiKey = (settings as any)?.api_key;
    const apiBaseUrl = (settings as any)?.api_base_url;

    if (!apiKey) {
      return res.status(422).json({ error: '请先在设置中配置 AI API Key' });
    }

    // Use AI to analyze the selected text
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey, baseURL: apiBaseUrl, timeout: 15_000 });

    const response = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `你是一个雅思备考助手。用户选中了一段英文文本，请判断它是词汇(vocabulary)、词组(collocation)还是句子(sentence)，并生成对应的学习摘录。

规则：
- 1-2个单词 → vocabulary
- 2-5个单词的短语 → collocation  
- 超过5个单词或完整句子 → sentence

所有字段必须使用英文填写（definition、example、analysis、scenario等全部用英文）。

请严格按以下JSON格式返回（不要返回其他内容）：
{
  "type": "vocabulary|collocation|sentence",
  "data": {
    // vocabulary: {"word":"...", "definition":"English definition", "partOfSpeech":"part of speech", "example":"example sentence"}
    // collocation: {"phrase":"...", "definition":"English definition", "example":"example sentence"}
    // sentence: {"sentence":"...", "analysis":"why it is worth learning", "scenario":"applicable scenario e.g. writing/speaking"}
  },
  "priority": "high|medium|low"
}`
        },
        { role: 'user', content: text.trim() }
      ],
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return res.status(502).json({ error: 'AI 返回空响应' });

    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { return res.status(502).json({ error: 'AI 返回格式异常' }); }

    const type = parsed.type;
    const data = parsed.data;
    const priority = parsed.priority || 'medium';

    if (!VALID_TYPES.includes(type)) return res.status(502).json({ error: 'AI 返回了无效的类型' });

    const result = await query(
      'INSERT INTO extractions (material_id, type, data, priority, mastered) VALUES (?, ?, ?, ?, ?)',
      materialId, type, JSON.stringify(data), priority, 0
    );
    const row = await queryOne('SELECT * FROM extractions WHERE id = ?', result.lastInsertRowid);
    return res.status(201).json(mapRow(row));
  } catch (err) {
    const msg = err instanceof Error ? err.message : '服务器内部错误';
    return res.status(500).json({ error: msg });
  }
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

router.delete('/:id', async (req, res) => {
  try {
    const row = await queryOne('SELECT * FROM extractions WHERE id = ?', req.params.id);
    if (!row) return res.status(404).json({ error: '资源不存在' });
    await query('DELETE FROM extractions WHERE id = ?', req.params.id);
    return res.status(204).end();
  } catch { return res.status(500).json({ error: '服务器内部错误' }); }
});

export default router;
