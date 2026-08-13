// src/data/repositories/SQLiteTranslationRepository.ts
// Concrete implementation of ITranslationRepository using SQLite + Drizzle

import { eq, desc, and } from 'drizzle-orm';
import { db } from '../datasources/local/db/database';
import { translations } from '../datasources/local/db/schema';
import type { ITranslationRepository } from '../../core/repositories/ITranslationRepository';
import type { Translation } from '../../core/entities/Translation';

function rowToEntity(row: typeof translations.$inferSelect): Translation {
  return {
    id:             row.id,
    sourceText:     row.sourceText,
    translatedText: row.translatedText,
    sourceLang:     row.sourceLang as Translation['sourceLang'],
    targetLang:     row.targetLang as Translation['targetLang'],
    direction:      row.direction as Translation['direction'],
    audioUri:       row.audioUri ?? undefined,
    isFavourite:    Boolean(row.isFavourite),
    createdAt:      row.createdAt instanceof Date
      ? row.createdAt
      : new Date(Number(row.createdAt)),
  };
}

export class SQLiteTranslationRepository implements ITranslationRepository {
  async save(translation: Translation): Promise<void> {
    await db.insert(translations).values({
      id:             translation.id,
      sourceText:     translation.sourceText,
      translatedText: translation.translatedText,
      sourceLang:     translation.sourceLang,
      targetLang:     translation.targetLang,
      direction:      translation.direction,
      audioUri:       translation.audioUri,
      isFavourite:    translation.isFavourite,
      createdAt:      translation.createdAt,
    });
  }

  async findById(id: string): Promise<Translation | null> {
    const rows = await db
      .select()
      .from(translations)
      .where(eq(translations.id, id))
      .limit(1);
    return rows[0] ? rowToEntity(rows[0]) : null;
  }

  async findAll(limit = 50, offset = 0): Promise<Translation[]> {
    const rows = await db
      .select()
      .from(translations)
      .orderBy(desc(translations.createdAt))
      .limit(limit)
      .offset(offset);
    return rows.map(rowToEntity);
  }

  async findFavourites(): Promise<Translation[]> {
    const rows = await db
      .select()
      .from(translations)
      .where(eq(translations.isFavourite, true))
      .orderBy(desc(translations.createdAt));
    return rows.map(rowToEntity);
  }

  async toggleFavourite(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) return;
    await db
      .update(translations)
      .set({ isFavourite: !existing.isFavourite })
      .where(eq(translations.id, id));
  }

  async delete(id: string): Promise<void> {
    await db.delete(translations).where(eq(translations.id, id));
  }

  async deleteAll(): Promise<void> {
    await db.delete(translations);
  }

  async count(): Promise<number> {
    const result = await db.select().from(translations);
    return result.length;
  }
}
