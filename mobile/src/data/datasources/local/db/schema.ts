// src/data/datasources/local/db/schema.ts
// Drizzle ORM schema for Voxa's SQLite database

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ── Translations (history) ────────────────────────────────────────────────────
export const translations = sqliteTable('translations', {
  id:             text('id').primaryKey(),
  sourceText:     text('source_text').notNull(),
  translatedText: text('translated_text').notNull(),
  sourceLang:     text('source_lang').notNull(),   // 'twi' | 'english'
  targetLang:     text('target_lang').notNull(),
  direction:      text('direction').notNull(),      // 'twi_to_english' | 'english_to_twi'
  audioUri:       text('audio_uri'),
  isFavourite:    integer('is_favourite', { mode: 'boolean' }).default(false).notNull(),
  createdAt:      integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ── Phrasebook ────────────────────────────────────────────────────────────────
export const phrases = sqliteTable('phrases', {
  id:          text('id').primaryKey(),
  category:    text('category').notNull(),
  twiText:     text('twi_text').notNull(),
  englishText: text('english_text').notNull(),
  audioUri:    text('audio_uri'),
  usageCount:  integer('usage_count').default(0).notNull(),
});

// ── Conversations ─────────────────────────────────────────────────────────────
export const conversations = sqliteTable('conversations', {
  id:        text('id').primaryKey(),
  title:     text('title').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const conversationTurns = sqliteTable('conversation_turns', {
  id:             text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id),
  speakerLang:    text('speaker_lang').notNull(),   // 'twi' | 'english'
  sourceText:     text('source_text').notNull(),
  translatedText: text('translated_text').notNull(),
  audioUri:       text('audio_uri'),
  createdAt:      integer('created_at', { mode: 'timestamp' }).notNull(),
});
