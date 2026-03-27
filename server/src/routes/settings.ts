import { Router } from 'express';
import { query, queryOne } from '../db.js';
import type { BandLevel, UserSettings } from '../../../shared/types.js';

const router = Router();

const VALID_BAND_LEVELS: BandLevel[] = ['5.0', '5.5', '6.0', '6.5', '7+'];

router.get('/', async (_req, res) => {
  try {
    const row = await queryOne('SELECT band_level, api_key, api_base_url FROM settings WHERE id = 1');
    if (!row) return res.status(500).json({ error: '设置数据不存在' });
    return res.json({
      bandLevel: row.band_level as BandLevel,
      apiKey: row.api_key as string,
      apiBaseUrl: row.api_base_url as string,
    });
  } catch { return res.status(500).json({ error: '服务器内部错误' }); }
});

router.put('/', async (req, res) => {
  try {
    const { bandLevel, apiKey, apiBaseUrl } = req.body;
    if (bandLevel !== undefined && !VALID_BAND_LEVELS.includes(bandLevel)) {
      return res.status(400).json({ error: `无效的英语水平` });
    }
    const updates: string[] = [];
    const values: unknown[] = [];
    if (bandLevel !== undefined) { updates.push('band_level = ?'); values.push(bandLevel); }
    if (apiKey !== undefined) { updates.push('api_key = ?'); values.push(apiKey); }
    if (apiBaseUrl !== undefined) { updates.push('api_base_url = ?'); values.push(apiBaseUrl); }
    if (updates.length === 0) return res.status(400).json({ error: '请提供至少一个要更新的字段' });

    await query(`UPDATE settings SET ${updates.join(', ')} WHERE id = 1`, ...values);
    const row = await queryOne('SELECT band_level, api_key, api_base_url FROM settings WHERE id = 1');
    return res.json({
      bandLevel: (row as any).band_level,
      apiKey: (row as any).api_key,
      apiBaseUrl: (row as any).api_base_url,
    });
  } catch { return res.status(500).json({ error: '服务器内部错误' }); }
});

export default router;
