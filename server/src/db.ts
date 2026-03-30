import { createClient, type Client, type ResultSet } from '@libsql/client';

const TURSO_URL = process.env.TURSO_DATABASE_URL || 'libsql://ielts-reviewer-cathychoi99.aws-ap-northeast-1.turso.io';
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || '';

let _client: Client | null = null;

export function getClient(): Client {
  if (!_client) {
    _client = createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN,
    });
  }
  return _client;
}

export async function initDatabase(): Promise<void> {
  const client = getClient();

  await client.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      band_level TEXT NOT NULL DEFAULT '6.0',
      api_key TEXT NOT NULL DEFAULT '',
      api_base_url TEXT NOT NULL DEFAULT 'https://api.deepseek.com'
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      source_tag TEXT NOT NULL,
      content TEXT NOT NULL,
      parse_status TEXT NOT NULL DEFAULT 'idle',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS extractions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium',
      mastered INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
    )
  `);

  // Insert default settings if not exists
  const row = await client.execute('SELECT id FROM settings WHERE id = 1');
  if (row.rows.length === 0) {
    await client.execute(
      `INSERT INTO settings (id, band_level, api_key, api_base_url) VALUES (1, '6.0', '', 'https://api.deepseek.com')`
    );
  }

  // Migration: add translation column if missing
  try {
    await client.execute(`ALTER TABLE materials ADD COLUMN translation TEXT`);
  } catch {
    // column already exists
  }
}

// Helper to run a query and return rows
export async function query(sql: string, ...params: unknown[]): Promise<ResultSet> {
  const client = getClient();
  return client.execute({ sql, args: params as any });
}

// Helper to run a query and return first row
export async function queryOne(sql: string, ...params: unknown[]): Promise<Record<string, unknown> | null> {
  const result = await query(sql, ...params);
  return result.rows.length > 0 ? (result.rows[0] as unknown as Record<string, unknown>) : null;
}
