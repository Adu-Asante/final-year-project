// src/shared/hooks/useTranslate.ts
// ViewModel hook for the full interpret pipeline.
// interpret() now RETURNS the translation so callers can chain speak()
// without relying on stale React state closures.

import { useState, useCallback, useRef } from 'react';
import { NLLBTranslationService }     from '../../infrastructure/translation/NLLBTranslationService';
import { TTSService }                  from '../../infrastructure/tts/TTSService';
import { SQLiteTranslationRepository } from '../../data/repositories/SQLiteTranslationRepository';
import { LanguageDetectionService }    from '../../infrastructure/langdetect/LanguageDetectionService';
import { TranslateUseCase }            from '../../core/usecases/TranslateUseCase';
import type { Translation, LanguageCode } from '../../core/entities/Translation';

// Singletons — created once per app session
const translationSvc = new NLLBTranslationService();
const ttsSvc         = new TTSService();
const repo           = new SQLiteTranslationRepository();
const langDetect     = new LanguageDetectionService();
const translateUC    = new TranslateUseCase(translationSvc, langDetect, repo);

export interface UseTranslateReturn {
  translation:   Translation | null;
  isTranslating: boolean;
  isSpeaking:    boolean;
  isThinking:    boolean;
  error:         string | null;
  /** Translates text and returns the result — safe to use directly in callbacks */
  interpret:     (text: string, forcedDirection?: 'twi_to_english' | 'english_to_twi') => Promise<Translation | null>;
  speak:         (translation: Translation) => Promise<void>;
  stopSpeaking:  () => Promise<void>;
  clearError:    () => void;
}

export function useTranslate(): UseTranslateReturn {
  const [translation,   setTranslation]   = useState<Translation | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSpeaking,    setIsSpeaking]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const isThinking = isTranslating;

  /**
   * interpret() — returns the Translation directly so callers can chain
   * speak() without hitting a stale-closure on the `translation` state.
   */
  const interpret = useCallback(async (
    text: string,
    forcedDirection?: 'twi_to_english' | 'english_to_twi'
  ): Promise<Translation | null> => {
    if (!text.trim()) return null;

    setIsTranslating(true);
    setError(null);

    try {
      const result = await translateUC.execute(text, forcedDirection);
      setTranslation(result);
      return result;            // ← return value for direct use
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Translation failed';
      setError(msg);
      return null;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const speak = useCallback(async (t: Translation) => {
    setIsSpeaking(true);
    try {
      await ttsSvc.speak(t.translatedText, t.targetLang, {
        onDone:    () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError:   () => setIsSpeaking(false),
      });
    } catch {
      setIsSpeaking(false);
    }
  }, []);

  const stopSpeaking = useCallback(async () => {
    await ttsSvc.stop();
    setIsSpeaking(false);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    translation,
    isTranslating,
    isSpeaking,
    isThinking,
    error,
    interpret,
    speak,
    stopSpeaking,
    clearError,
  };
}
