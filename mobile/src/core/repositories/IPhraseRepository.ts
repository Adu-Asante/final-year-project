// src/core/repositories/IPhraseRepository.ts
import type { Phrase, PhraseCategory } from '../entities/Phrase';

export interface IPhraseRepository {
  findAll(): Promise<Phrase[]>;
  findByCategory(category: PhraseCategory): Promise<Phrase[]>;
  search(query: string): Promise<Phrase[]>;
  incrementUsage(id: string): Promise<void>;
  seed(phrases: Phrase[]): Promise<void>;
}
