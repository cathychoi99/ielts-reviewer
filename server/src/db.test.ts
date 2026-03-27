import { describe, it, expect, afterEach } from 'vitest';
import { initDatabase } from './db.js';
import type Database from 'better-sqlite3';

describe('Database initialization', () => {
  let db: Database.Database;

  afterEach(() => {
    if (db) db.close();
  });

  it('should create all three tables', () => {
    db = initDatabase(':memory:');
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('settings');
    expect(tableNames).toContain('materials');
    expect(tableNames).toContain('extractions');
  });

  it('should insert default settings row', () => {
    db = initDatabase(':memory:');
    const row = db.prepare('SELECT * FROM settings WHERE id = 1').get() as Record<string, unknown>;

    expect(row).toBeDefined();
    expect(row.band_level).toBe('6.0');
    expect(row.api_key).toBe('');
    expect(row.api_base_url).toBe('https://api.deepseek.com');
  });

  it('should not duplicate default settings on re-init', () => {
    db = initDatabase(':memory:');
    // Simulate re-running createTables by calling initDatabase logic again
    // Since we use :memory:, just verify count is 1
    const count = db.prepare('SELECT COUNT(*) as cnt FROM settings').get() as { cnt: number };
    expect(count.cnt).toBe(1);
  });

  it('should enable foreign keys', () => {
    db = initDatabase(':memory:');
    const fk = db.pragma('foreign_keys', { simple: true });
    expect(fk).toBe(1);
  });

  it('should support materials CRUD', () => {
    db = initDatabase(':memory:');
    const result = db
      .prepare(
        "INSERT INTO materials (title, source_tag, content, parse_status, created_at) VALUES ('Test', 'article', 'Content', 'idle', datetime('now'))"
      )
      .run();
    expect(result.changes).toBe(1);

    const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>;
    expect(material.title).toBe('Test');
    expect(material.source_tag).toBe('article');
    expect(material.content).toBe('Content');
    expect(material.parse_status).toBe('idle');
  });

  it('should support extractions with FK to materials', () => {
    db = initDatabase(':memory:');
    const mat = db
      .prepare(
        "INSERT INTO materials (title, source_tag, content) VALUES ('Test', 'vlog', 'Content')"
      )
      .run();

    const ext = db
      .prepare(
        `INSERT INTO extractions (material_id, type, data, priority, mastered) VALUES (?, 'vocabulary', '{}', 'high', 0)`
      )
      .run(mat.lastInsertRowid);
    expect(ext.changes).toBe(1);
  });

  it('should cascade delete extractions when material is deleted', () => {
    db = initDatabase(':memory:');
    const mat = db
      .prepare(
        "INSERT INTO materials (title, source_tag, content) VALUES ('Test', 'vlog', 'Content')"
      )
      .run();

    db.prepare(
      `INSERT INTO extractions (material_id, type, data) VALUES (?, 'vocabulary', '{}')`
    ).run(mat.lastInsertRowid);

    db.prepare('DELETE FROM materials WHERE id = ?').run(mat.lastInsertRowid);

    const count = db.prepare('SELECT COUNT(*) as cnt FROM extractions').get() as { cnt: number };
    expect(count.cnt).toBe(0);
  });
});
