// src/infrastructure/langdetect/LanguageDetectionService.ts
// Lightweight language detection for Twi vs English
// Uses heuristic approach: Twi has characteristic characters and common words
// Can be upgraded to a full ML model later without changing the interface

import type { LanguageCode } from '../../core/entities/Translation';
import type { ILanguageDetectionService } from '../../core/usecases/TranslateUseCase';

// Common Twi words and patterns
const TWI_INDICATORS = new Set([
  'medaase', 'akwaaba', 'ɛte', 'sɛn', 'yɛ', 'me', 'wo', 'ɔ', 'ɛ',
  'ɔkra', 'obia', 'na', 'nti', 'mpaebo', 'bra', 'kɔ', 'da', 'wiase',
  'twi', 'akan', 'ghana', 'yεn', 'ɛyɛ', 'maakye', 'maaha', 'maadwo',
  'ete', 'sen', 'wɔ', 'wode', 'εyε', 'dabi', 'aane', 'ɛnne',
]);

// Twi uses ɛ (U+025B) and ɔ (U+0254) which are uncommon in English
const TWI_CHARS_REGEX = /[ɛɔɛɔ]/u;

export class LanguageDetectionService implements ILanguageDetectionService {
  async detect(text: string): Promise<LanguageCode> {
    const lower = text.toLowerCase().trim();

    // Fast path: Twi-specific unicode characters
    if (TWI_CHARS_REGEX.test(lower)) return 'twi';

    // Check for common Twi words
    const words = lower.split(/\s+/);
    const twiMatches = words.filter(w => TWI_INDICATORS.has(w)).length;

    // If more than one Twi word found, or any single-word match
    if (twiMatches >= 1) return 'twi';

    // Default to English
    return 'english';
  }
}
