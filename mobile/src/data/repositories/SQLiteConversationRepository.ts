// src/data/repositories/SQLiteConversationRepository.ts
// Persists conversation sessions and turns to SQLite

import { eq, desc } from 'drizzle-orm';
import { db } from '../datasources/local/db/database';
import { conversations, conversationTurns } from '../datasources/local/db/schema';
import type { Conversation, ConversationTurn } from '../../core/entities/Conversation';
import type { LanguageCode } from '../../core/entities/Translation';

// ── Row → Entity helpers ──────────────────────────────────────────────────────

function rowToConversation(
  row: typeof conversations.$inferSelect,
  turns: ConversationTurn[] = []
): Conversation {
  return {
    id:        row.id,
    title:     row.title,
    turns,
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(Number(row.createdAt)),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(Number(row.updatedAt)),
  };
}

function rowToTurn(row: typeof conversationTurns.$inferSelect): ConversationTurn {
  return {
    id:             row.id,
    conversationId: row.conversationId,
    speakerLang:    row.speakerLang as LanguageCode,
    sourceText:     row.sourceText,
    translatedText: row.translatedText,
    audioUri:       row.audioUri ?? undefined,
    createdAt:      row.createdAt instanceof Date ? row.createdAt : new Date(Number(row.createdAt)),
  };
}

// ── Repository ────────────────────────────────────────────────────────────────

export class SQLiteConversationRepository {
  // ── Conversations ──────────────────────────────────────────────────────────

  async createConversation(id: string, title: string): Promise<Conversation> {
    const now = new Date();
    await db.insert(conversations).values({
      id,
      title,
      createdAt: now,
      updatedAt: now,
    });
    return { id, title, turns: [], createdAt: now, updatedAt: now };
  }

  async findConversationById(id: string): Promise<Conversation | null> {
    const rows = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);

    if (!rows[0]) return null;

    const turns = await this.findTurnsByConversation(id);
    return rowToConversation(rows[0], turns);
  }

  async findAllConversations(): Promise<Conversation[]> {
    const convRows = await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.updatedAt));

    return Promise.all(
      convRows.map(async (row: typeof conversations.$inferSelect) => {
        const turns = await this.findTurnsByConversation(row.id);
        return rowToConversation(row, turns);
      })
    );
  }

  async updateConversationTimestamp(id: string): Promise<void> {
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, id));
  }

  async deleteConversation(id: string): Promise<void> {
    // Delete turns first (FK constraint)
    await db
      .delete(conversationTurns)
      .where(eq(conversationTurns.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  // ── Turns ──────────────────────────────────────────────────────────────────

  async addTurn(turn: ConversationTurn): Promise<void> {
    await db.insert(conversationTurns).values({
      id:             turn.id,
      conversationId: turn.conversationId,
      speakerLang:    turn.speakerLang,
      sourceText:     turn.sourceText,
      translatedText: turn.translatedText,
      audioUri:       turn.audioUri,
      createdAt:      turn.createdAt,
    });

    // Keep conversation updatedAt fresh
    await this.updateConversationTimestamp(turn.conversationId);
  }

  async findTurnsByConversation(conversationId: string): Promise<ConversationTurn[]> {
    const rows = await db
      .select()
      .from(conversationTurns)
      .where(eq(conversationTurns.conversationId, conversationId))
      .orderBy(conversationTurns.createdAt);
    return rows.map(rowToTurn);
  }
}
