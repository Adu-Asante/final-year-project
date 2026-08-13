// src/data/datasources/local/db/database.ts
// Fault-tolerant SQLite connection and migration bootstrap
// Lazy initialization prevents top-level module load crashes in Expo Go / web / preview builds.

import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

let sqliteDb: SQLite.SQLiteDatabase | null = null;
let drizzleDb: ReturnType<typeof drizzle> | null = null;

export function getSQLiteDatabase(): SQLite.SQLiteDatabase | null {
  if (sqliteDb) return sqliteDb;
  try {
    sqliteDb = SQLite.openDatabaseSync('voxa.db');
    try {
      sqliteDb.execSync('PRAGMA journal_mode = WAL;');
    } catch (e) {
      console.warn('SQLite PRAGMA WAL warning:', e);
    }
    return sqliteDb;
  } catch (err) {
    console.warn('SQLite openDatabaseSync warning:', err);
    return null;
  }
}

export function getDb() {
  if (drizzleDb) return drizzleDb;
  const sDb = getSQLiteDatabase();
  if (sDb) {
    drizzleDb = drizzle(sDb, { schema });
    return drizzleDb;
  }
  // Fallback dummy for unsupported environments
  return null as any;
}

// Proxy export for db
export const db = new Proxy({} as any, {
  get(_, prop) {
    const activeDb = getDb();
    if (activeDb && prop in activeDb) {
      return (activeDb as any)[prop];
    }
    return undefined;
  },
});

/**
 * Run migrations safely on startup.
 */
export async function migrateDatabase(): Promise<void> {
  const sDb = getSQLiteDatabase();
  if (!sDb) return;

  try {
    sDb.execSync(`
      CREATE TABLE IF NOT EXISTS translations (
        id TEXT PRIMARY KEY,
        source_text TEXT NOT NULL,
        translated_text TEXT NOT NULL,
        source_lang TEXT NOT NULL,
        target_lang TEXT NOT NULL,
        direction TEXT NOT NULL,
        audio_uri TEXT,
        is_favourite INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS phrases (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        twi_text TEXT NOT NULL,
        english_text TEXT NOT NULL,
        audio_uri TEXT,
        usage_count INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS conversation_turns (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id),
        speaker_lang TEXT NOT NULL,
        source_text TEXT NOT NULL,
        translated_text TEXT NOT NULL,
        audio_uri TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_translations_created_at
        ON translations(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_translations_favourite
        ON translations(is_favourite);
      CREATE INDEX IF NOT EXISTS idx_phrases_category
        ON phrases(category);
      CREATE INDEX IF NOT EXISTS idx_turns_conversation
        ON conversation_turns(conversation_id);
    `);
  } catch (err) {
    console.warn('Database migration execSync warning:', err);
  }
}
