// src/core/entities/Conversation.ts
// Domain entities for two-way conversation mode

import type { LanguageCode } from './Translation';

export interface ConversationTurn {
  id: string;
  conversationId: string;
  speakerLang: LanguageCode;
  sourceText: string;
  translatedText: string;
  audioUri?: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  title: string;
  turns: ConversationTurn[];
  createdAt: Date;
  updatedAt: Date;
}

export function createTurn(
  partial: Omit<ConversationTurn, 'id' | 'createdAt'>
): ConversationTurn {
  return {
    ...partial,
    id: `turn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date(),
  };
}
