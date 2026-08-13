// src/core/usecases/TranslateUseCase.ts
// Orchestrates: detect language → translate → persist history

import type { ITranslationRepository } from '../repositories/ITranslationRepository';
import { createTranslation, type LanguageCode, type Translation } from '../entities/Translation';

export interface ITranslationService {
  translate(text: string, direction: 'twi_to_english' | 'english_to_twi'): Promise<string>;
}

export interface ILanguageDetectionService {
  detect(text: string): Promise<LanguageCode>;
}

export class TranslateUseCase {
  constructor(
    private readonly translationService: ITranslationService,
    private readonly languageDetection: ILanguageDetectionService,
    private readonly repository: ITranslationRepository
  ) {}

  async execute(
    text: string,
    forcedDirection?: 'twi_to_english' | 'english_to_twi'
  ): Promise<Translation> {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('Text cannot be empty');

    // 1. Detect language
    const detectedLang = await this.languageDetection.detect(trimmed);
    const direction =
      forcedDirection ?? (detectedLang === 'twi' ? 'twi_to_english' : 'english_to_twi');

    const sourceLang: LanguageCode = direction === 'twi_to_english' ? 'twi' : 'english';
    const targetLang: LanguageCode = direction === 'twi_to_english' ? 'english' : 'twi';

    // 2. Translate
    const translatedText = await this.translationService.translate(trimmed, direction);

    // 3. Persist to history
    const translation = createTranslation({
      sourceText: trimmed,
      translatedText,
      sourceLang,
      targetLang,
      direction,
    });

    await this.repository.save(translation);
    return translation;
  }
}
