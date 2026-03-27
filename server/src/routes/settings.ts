import { Router } from 'express';
import { getDatabase } from '../db.js';
import type { BandLevel, UserSettings } from '../../../shared/types.js';

const router = Router();

const VALID_BAND_LEVELS: BandLevel[] = ['5.0', '5.5', '6.0', '6.5', '7+'];

// GET /api/settings
router.get('/', (_req, res) => {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT band_level, api_key, api_base_url FROM settings WHERE id = 1').get() as {
      band_level: string;
      api_key: string;
      api_base_url: string;
    } | undefined;

    if (!row) {
      return res.status(500).json({ error: '设置数据不存在' });
    }

    const settings: UserSettings = {
      bandLevel: row.band_level as BandLevel,
      apiKey: row.api_key,
      apiBaseUrl: row.api_base_url,
    };

    return res.json(settings);
  } catch {
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /api/settings
router.put('/', (req, res) => {
  try {
    const { bandLevel, apiKey, apiBaseUrl } = req.body;

    if (bandLevel !== undefined && !VALID_BAND_LEVELS.includes(bandLevel)) {
      return res.status(400).json({ error: `无效的英语水平，有效值为: ${VALID_BAND_LEVELS.join(', ')}` });
    }

    const db = getDatabase();

    // Build dynamic update
    const updates: string[] = [];
    const values: unknown[] = [];

    if (bandLevel !== undefined) {
      updates.push('band_level = ?');
      values.push(bandLevel);
    }
    if (apiKey !== undefined) {
      updates.push('api_key = ?');
      values.push(apiKey);
    }
    if (apiBaseUrl !== undefined) {
      updates.push('api_base_url = ?');
      values.push(apiBaseUrl);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '请提供至少一个要更新的字段' });
    }

    db.prepare(`UPDATE settings SET ${updates.join(', ')} WHERE id = 1`).run(...values);

    // Return updated settings
    const row = db.prepare('SELECT band_level, api_key, api_base_url FROM settings WHERE id = 1').get() as {
      band_level: string;
      api_key: string;
      api_base_url: string;
    };

    const settings: UserSettings = {
      bandLevel: row.band_level as BandLevel,
      apiKey: row.api_key,
      apiBaseUrl: row.api_base_url,
    };

    return res.json(settings);
  } catch {
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
