// src/core/entities/Translation.ts
// Domain entity — pure TypeScript, no React Native dependencies

export type LanguageCode = 'twi' | 'english';

export type TranslationDirection = 'twi_to_english' | 'english_to_twi';

export interface Translation {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  direction: TranslationDirection;
  audioUri?: string;        // Local path to cached TTS audio
  isFavourite: boolean;
  createdAt: Date;
}

export function createTranslation(
  partial: Omit<Translation, 'id' | 'isFavourite' | 'createdAt'>
): Translation {
  return {
    ...partial,
    id: generateId(),
    isFavourite: false,
    createdAt: new Date(),
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
