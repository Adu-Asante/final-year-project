// src/core/repositories/ITranslationRepository.ts
import type { Translation } from '../entities/Translation';

export interface ITranslationRepository {
  save(translation: Translation): Promise<void>;
  findById(id: string): Promise<Translation | null>;
  findAll(limit?: number, offset?: number): Promise<Translation[]>;
  findFavourites(): Promise<Translation[]>;
  toggleFavourite(id: string): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<void>;
  count(): Promise<number>;
}
