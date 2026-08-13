// src/infrastructure/speech/NativeSTTService.ts
// Primary STT implementation using @react-native-voice/voice
//
// FIXES (v2):
//  1. Voice.isAvailable() returns 0 | 1 on some builds — cast to boolean explicitly.
//  2. 'tw-GH' locale is unsupported on most Android devices. We now try 'tw-GH' first,
//     and if Voice.start() throws, we retry with 'en-US' so the mic still works
//     (the NLLB model handles actual Twi interpretation on the backend).
//  3. Audio session is released before starting STT so iOS doesn't conflict
//     with any lingering TTS audio session.
//  4. Added destroy() call in cleanup for older react-native-voice versions.

import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';
import { Platform } from 'react-native';
import type {
  ISpeechRecognitionService,
  SpeechRecognitionCallbacks,
} from './ISpeechRecognitionService';

export class NativeSTTService implements ISpeechRecognitionService {
  private _isListening = false;
  private _callbacks: SpeechRecognitionCallbacks | null = null;
  private _initialized = false;

  get isAvailable(): boolean {
    return true;
  }

  get isListening(): boolean {
    return this._isListening;
  }

  constructor() {
    this._bindHandlers();
  }

  private _bindHandlers(): void {
    Voice.onSpeechStart = () => {
      this._isListening = true;
      this._callbacks?.onStart?.();
    };

    Voice.onSpeechEnd = () => {
      this._isListening = false;
      this._callbacks?.onEnd?.();
    };

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      const partial = e.value?.[0] ?? '';
      if (partial) {
        this._callbacks?.onPartialResult?.(partial);
      }
    };

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const transcript = e.value?.[0] ?? '';
      this._isListening = false;
      this._callbacks?.onFinalResult({ transcript });
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      this._isListening = false;
      const msg = e.error?.message ?? 'Speech recognition error';
      // Error code 7 = "No match" — not a fatal error, just no speech detected
      const isNoMatch = msg.includes('7') || msg.toLowerCase().includes('no match');
      if (isNoMatch) {
        // Treat as empty result rather than error
        this._callbacks?.onFinalResult({ transcript: '' });
      } else {
        this._callbacks?.onError?.(new Error(msg));
      }
    };

    this._initialized = true;
  }

  async startListening(
    language: 'tw-GH' | 'en-US' | 'en-GB',
    callbacks: SpeechRecognitionCallbacks
  ): Promise<void> {
    this._callbacks = callbacks;

    try {
      this._isListening = true;
      callbacks.onStart?.();

      // Voice.isAvailable() returns a number (0 or 1) on some RN builds
      const rawAvailable = await Voice.isAvailable();
      const available = Boolean(rawAvailable);

      if (!available) {
        throw new Error(
          'Speech recognition is unavailable on this device.\n' +
          'Make sure you are using the Expo Dev Client build (not Expo Go) ' +
          'and that microphone permission has been granted.'
        );
      }

      // Destroy any previous session before starting a new one
      try { await Voice.destroy(); } catch {}

      const options: Record<string, unknown> = {
        EXTRA_PARTIAL_RESULTS: true,
      };

      // Android: force Google recognizer for best results
      if (Platform.OS === 'android') {
        options['RECOGNIZER_ENGINE'] = 'GOOGLE';
      }

      try {
        // Try the requested locale first
        await Voice.start(language, options);
      } catch (localeErr) {
        // 'tw-GH' is rarely installed on devices — fall back to 'en-US' so the mic
        // still picks up speech. The NLLB model on the backend will translate it.
        if (language === 'tw-GH') {
          console.warn('[NativeSTTService] tw-GH locale unavailable, retrying with en-US:', localeErr);
          await Voice.start('en-US', options);
        } else {
          throw localeErr;
        }
      }
    } catch (err) {
      this._isListening = false;
      callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  async stopListening(): Promise<void> {
    try {
      await Voice.stop();
    } finally {
      this._isListening = false;
    }
  }

  destroy(): void {
    Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
  }
}
