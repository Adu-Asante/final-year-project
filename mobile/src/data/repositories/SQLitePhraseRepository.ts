// src/data/repositories/SQLitePhraseRepository.ts
// Concrete implementation of IPhraseRepository using SQLite + Drizzle
// Seeds the DB on first launch from the hardcoded phrase list

import { eq, like, or } from 'drizzle-orm';
import { db } from '../datasources/local/db/database';
import { phrases } from '../datasources/local/db/schema';
import type { IPhraseRepository } from '../../core/repositories/IPhraseRepository';
import type { Phrase, PhraseCategory } from '../../core/entities/Phrase';

function rowToEntity(row: typeof phrases.$inferSelect): Phrase {
  return {
    id:          row.id,
    category:    row.category as PhraseCategory,
    twiText:     row.twiText,
    englishText: row.englishText,
    audioUri:    row.audioUri ?? undefined,
    usageCount:  row.usageCount,
  };
}

export class SQLitePhraseRepository implements IPhraseRepository {
  async findAll(): Promise<Phrase[]> {
    const rows = await db.select().from(phrases);
    return rows.map(rowToEntity);
  }

  async findByCategory(category: PhraseCategory): Promise<Phrase[]> {
    const rows = await db
      .select()
      .from(phrases)
      .where(eq(phrases.category, category));
    return rows.map(rowToEntity);
  }

  async search(query: string): Promise<Phrase[]> {
    const pattern = `%${query}%`;
    const rows = await db
      .select()
      .from(phrases)
      .where(
        or(
          like(phrases.twiText, pattern),
          like(phrases.englishText, pattern)
        )
      );
    return rows.map(rowToEntity);
  }

  async incrementUsage(id: string): Promise<void> {
    const existing = await db
      .select()
      .from(phrases)
      .where(eq(phrases.id, id))
      .limit(1);

    if (!existing[0]) return;

    await db
      .update(phrases)
      .set({ usageCount: existing[0].usageCount + 1 })
      .where(eq(phrases.id, id));
  }

  async seed(phraseList: Phrase[]): Promise<void> {
    // Only seed if table is empty
    const existing = await db.select().from(phrases).limit(1);
    if (existing.length > 0) return;

    await db.insert(phrases).values(
      phraseList.map(p => ({
        id:          p.id,
        category:    p.category,
        twiText:     p.twiText,
        englishText: p.englishText,
        audioUri:    p.audioUri,
        usageCount:  p.usageCount,
      }))
    );
  }

  async count(): Promise<number> {
    const result = await db.select().from(phrases);
    return result.length;
  }
}
