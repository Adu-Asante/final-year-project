// src/shared/hooks/useSTT.ts
// Speech-to-Text ViewModel hook.
//
// PRIMARY ENGINE: WhisperSTTService (backend faster-whisper)
//   - Records audio on device, uploads to backend for transcription
//   - Works on both Android AND iOS — no OS locale dependency
//   - Handles Twi/Akan natively via Whisper's multilingual model
//
// INTERACTION PATTERN: Push-to-talk
//   - Tap mic → startListening() → recording begins
//   - Tap mic again → stopAndTranscribe() → backend transcribes → onResult fires
//   - Or wait MAX_RECORD_MS and recording auto-finalizes
//
// FALLBACK: NativeSTTService used only if WhisperSTTService is unavailable.

import { useState, useCallback, useRef } from 'react';
import { WhisperSTTService } from '../../infrastructure/speech/WhisperSTTService';
import type { LanguageCode } from '../../core/entities/Translation';

/** Called with the final transcript when recognition completes */
type OnResultCallback = (transcript: string) => Promise<void> | void;

export interface UseSTTReturn {
  isListening:        boolean;
  isTranscribing:     boolean;  // true while audio is being uploaded to Whisper
  partialTranscript:  string;
  finalTranscript:    string;
  error:              string | null;
  startListening:     (lang: LanguageCode, onResult?: OnResultCallback) => Promise<void>;
  stopAndTranscribe:  (lang: LanguageCode, onResult?: OnResultCallback) => Promise<void>;
  stopListening:      () => Promise<void>;
  reset:              () => void;
}

// Module-level singleton — persists across re-renders
const whisperStt = new WhisperSTTService();

export function useSTT(): UseSTTReturn {
  const [isListening,       setIsListening]       = useState(false);
  const [isTranscribing,    setIsTranscribing]    = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [finalTranscript,   setFinalTranscript]   = useState('');
  const [error,             setError]             = useState<string | null>(null);

  // Keep the current lang and callback in refs so closures inside the service
  // always see the latest values without re-creating callbacks
  const langRef       = useRef<LanguageCode>('english');
  const onResultRef   = useRef<OnResultCallback | undefined>(undefined);

  // ── Start listening (begin recording) ─────────────────────────────────────
  const startListening = useCallback(async (
    lang: LanguageCode,
    onResult?: OnResultCallback
  ) => {
    if (isListening) return;

    langRef.current     = lang;
    onResultRef.current = onResult;

    setError(null);
    setPartialTranscript('');
    setFinalTranscript('');

    const locale = lang === 'twi' ? 'tw-GH' : 'en-US';

    await whisperStt.startListening(locale, {
      onStart: () => {
        setIsListening(true);
      },
      onPartialResult: (partial) => {
        // WhisperSTT doesn't emit partials (batch upload) but keep for future
        setPartialTranscript(partial);
      },
      onFinalResult: async (result) => {
        setFinalTranscript(result.transcript);
        setPartialTranscript('');
        setIsListening(false);
        setIsTranscribing(false);

        if (onResultRef.current && result.transcript.trim()) {
          await onResultRef.current(result.transcript);
        }
      },
      onError: (err) => {
        setError(err.message);
        setIsListening(false);
        setIsTranscribing(false);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });
  }, [isListening]);

  // ── Stop and upload to Whisper (get result) ────────────────────────────────
  const stopAndTranscribe = useCallback(async (
    lang: LanguageCode,
    onResult?: OnResultCallback
  ) => {
    if (!whisperStt.isListening) return;

    // Allow overriding the callback at stop-time
    if (onResult) onResultRef.current = onResult;
    const locale = (lang ?? langRef.current) === 'twi' ? 'tw-GH' : 'en-US';

    setIsListening(false);
    setIsTranscribing(true);  // Show "transcribing..." spinner

    await whisperStt.stopAndTranscribe(locale, {
      onFinalResult: async (result) => {
        setFinalTranscript(result.transcript);
        setPartialTranscript('');
        setIsTranscribing(false);

        if (onResultRef.current && result.transcript.trim()) {
          await onResultRef.current(result.transcript);
        }
      },
      onError: (err) => {
        setError(err.message);
        setIsTranscribing(false);
      },
      onEnd: () => {
        setIsTranscribing(false);
      },
    });
  }, []);

  // ── Cancel (stop without transcribing) ────────────────────────────────────
  const stopListening = useCallback(async () => {
    await whisperStt.stopListening();
    setIsListening(false);
    setIsTranscribing(false);
  }, []);

  const reset = useCallback(() => {
    setPartialTranscript('');
    setFinalTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    isTranscribing,
    partialTranscript,
    finalTranscript,
    error,
    startListening,
    stopAndTranscribe,
    stopListening,
    reset,
  };
}
