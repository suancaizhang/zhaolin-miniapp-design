import { DatabaseSync } from 'node:sqlite';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
export const pendingReason = '待作者确认作品归属与正式素材';

export async function openDatabase(dataDir: string): Promise<DatabaseSync> {
  await mkdir(resolve(dataDir), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(resolve(dataDir, 'gallery.sqlite'));
  try {
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS maintainers (
        username TEXT PRIMARY KEY, salt TEXT NOT NULL, password_hash TEXT NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY, username TEXT NOT NULL REFERENCES maintainers(username),
        csrf_token TEXT NOT NULL, expires_at INTEGER NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY, alt TEXT NOT NULL, view TEXT NOT NULL CHECK(view IN ('整体','局部')),
        width INTEGER NOT NULL, height INTEGER NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS series (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL,
        cover_image_id TEXT REFERENCES images(id), sort INTEGER NOT NULL CHECK(sort >= 0)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS works (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('创作中','已完成')),
        year TEXT NOT NULL, material TEXT NOT NULL, dimensions TEXT NOT NULL,
        featured INTEGER NOT NULL CHECK(featured IN (0,1)), sort INTEGER NOT NULL CHECK(sort >= 0),
        cover_image_id TEXT NOT NULL REFERENCES images(id), overall_image_id TEXT NOT NULL REFERENCES images(id)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS work_images (
        work_id TEXT NOT NULL REFERENCES works(id), image_id TEXT NOT NULL REFERENCES images(id),
        position INTEGER NOT NULL, PRIMARY KEY(work_id,image_id)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS work_series (
        work_id TEXT NOT NULL REFERENCES works(id), series_id TEXT NOT NULL REFERENCES series(id),
        position INTEGER NOT NULL, PRIMARY KEY(work_id,series_id)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS records (
        work_id TEXT NOT NULL REFERENCES works(id), id TEXT NOT NULL,
        stage TEXT NOT NULL CHECK(stage IN ('线稿','设色','完成效果')),
        view TEXT NOT NULL CHECK(view IN ('整体','局部')), caption TEXT NOT NULL,
        date TEXT NOT NULL, image_id TEXT NOT NULL REFERENCES images(id), position INTEGER NOT NULL,
        PRIMARY KEY(work_id,id)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS sources (
        id TEXT PRIMARY KEY, source_index TEXT NOT NULL, published_at TEXT NOT NULL, summary TEXT NOT NULL,
        work_id TEXT REFERENCES works(id), record_id TEXT, reason TEXT NOT NULL,
        FOREIGN KEY(work_id,record_id) REFERENCES records(work_id,id) DEFERRABLE INITIALLY DEFERRED,
        CHECK(record_id IS NULL OR work_id IS NOT NULL),
        CHECK(work_id IS NOT NULL OR length(trim(reason)) > 0)
      ) STRICT;
    `);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export function transaction<T>(db: DatabaseSync, operation: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = operation();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export async function seedSources(db: DatabaseSync, sourceIndexPath?: string): Promise<void> {
  const raw: unknown = JSON.parse(await readFile(sourceIndexPath ?? resolve(projectRoot, 'server/source-index.json'), 'utf8'));
  if (!Array.isArray(raw) || raw.length !== 43) throw new Error('Source index must contain exactly 43 entries.');
  const ids = new Set<string>();
  const sources = raw.map((entry: unknown) => {
    if (entry === null || typeof entry !== 'object') throw new Error('Invalid source index entry.');
    const row = entry as Record<string, unknown>;
    if (typeof row.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(row.id) || ids.has(row.id)
      || typeof row.index !== 'string' || typeof row.publishedAt !== 'string' || typeof row.summary !== 'string') {
      throw new Error('Invalid source index fields.');
    }
    ids.add(row.id);
    return { id: row.id, index: row.index, publishedAt: row.publishedAt, summary: row.summary };
  });
  transaction(db, () => {
    const insert = db.prepare('INSERT INTO sources(id,source_index,published_at,summary,reason) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING');
    for (const source of sources) insert.run(source.id, source.index, source.publishedAt, source.summary, pendingReason);
  });
}
