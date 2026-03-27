import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'ielts.db');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function createTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      band_level TEXT NOT NULL DEFAULT '6.0',
      api_key TEXT NOT NULL DEFAULT '',
      api_base_url TEXT NOT NULL DEFAULT 'https://api.deepseek.com'
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      source_tag TEXT NOT NULL,
      content TEXT NOT NULL,
      parse_status TEXT NOT NULL DEFAULT 'idle',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS extractions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium',
      mastered INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
    );
  `);

  // Insert default settings row if not exists
  const row = db.prepare('SELECT id FROM settings WHERE id = 1').get();
  if (!row) {
    db.prepare(
      `INSERT INTO settings (id, band_level, api_key, api_base_url) VALUES (1, '6.0', '', 'https://api.deepseek.com')`
    ).run();
  }
}

export function initDatabase(dbPath?: string): Database.Database {
  if (!dbPath) {
    ensureDataDir();
  }
  const db = new Database(dbPath ?? DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  createTables(db);
  return db;
}

// Singleton instance for the application
let _db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!_db) {
    _db = initDatabase();
  }
  return _db;
}

export function closeDatabase(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
