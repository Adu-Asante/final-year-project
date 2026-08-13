// src/infrastructure/speech/WhisperSTTService.ts
// Cross-platform STT using backend faster-whisper.
//
// Flow:
//   1. Request microphone permission
//   2. Record audio to an m4a file using expo-audio's AudioRecorder
//   3. POST file to FastAPI /api/v1/stt with Whisper language hint
//   4. Backend transcribes with faster-whisper (handles Twi/Akan natively)
//   5. Return transcript to caller — same interface as ISpeechRecognitionService
//
// FALLBACK: If expo-audio native module is unavailable on the client build,
// falls back to NativeSTTService (@react-native-voice/voice) so the mic ALWAYS works.

import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
  type AudioRecorder,
  type RecordingOptions,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import type {
  ISpeechRecognitionService,
  SpeechRecognitionCallbacks,
} from './ISpeechRecognitionService';
import { NativeSTTService } from './NativeSTTService';
import { getBackendUrl } from '../../shared/config/apiConfig';

const SPEECH_RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,   // mono — optimal for speech
  sampleRate:      16000, // 16 kHz — optimal input for Whisper model
};

const MAX_RECORD_MS = 30_000;

export class WhisperSTTService implements ISpeechRecognitionService {
  private _recorder:      AudioRecorder | null = null;
  private _isListening:   boolean = false;
  private _stopTimer:     ReturnType<typeof setTimeout> | null = null;
  private _nativeFallback: NativeSTTService | null = null;
  private _usingFallback:  boolean = false;

  get isAvailable(): boolean { return true; }
  get isListening(): boolean { return this._isListening || (this._nativeFallback?.isListening ?? false); }

  async startListening(
    language: 'tw-GH' | 'en-US' | 'en-GB',
    callbacks: SpeechRecognitionCallbacks
  ): Promise<void> {
    if (this._isListening) return;

    // ── 1. Request microphone permission ──────────────────────────────────────
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        callbacks.onError?.(new Error('Microphone permission denied. Please allow microphone access in Settings.'));
        return;
      }
    } catch {
      // Permission request fallback
    }

    // ── 2. Configure audio session for recording ──────────────────────────────
    try {
      await setAudioModeAsync({
        playsInSilentMode:     true,
        interruptionMode:      'doNotMix',
        allowsRecording:       true,
        shouldPlayInBackground: false,
      });
    } catch (err) {
      console.warn('[WhisperSTT] setAudioModeAsync failed:', err);
    }

    // ── 3. Try expo-audio recorder; fallback to NativeSTT if native module missing ──
    try {
      const { AudioModule } = await import('expo-audio');
      if (!AudioModule || !AudioModule.AudioRecorder) {
        throw new Error('ExpoAudio native module unavailable');
      }

      const recorder = new AudioModule.AudioRecorder(SPEECH_RECORDING_OPTIONS);
      this._recorder = recorder;

      await recorder.prepareToRecordAsync();
      recorder.record();

      this._isListening = true;
      this._usingFallback = false;
      callbacks.onStart?.();

      this._stopTimer = setTimeout(() => {
        this._finalize(language, callbacks);
      }, MAX_RECORD_MS);

    } catch (err) {
      console.warn('[WhisperSTT] ExpoAudio failed, using NativeSTT fallback:', err);
      this._usingFallback = true;
      if (!this._nativeFallback) {
        this._nativeFallback = new NativeSTTService();
      }
      return this._nativeFallback.startListening(language, callbacks);
    }
  }

  async stopListening(): Promise<void> {
    if (this._usingFallback && this._nativeFallback) {
      return this._nativeFallback.stopListening();
    }
    if (this._stopTimer) { clearTimeout(this._stopTimer); this._stopTimer = null; }
    const recorder = this._recorder;
    this._recorder = null;
    this._isListening = false;

    if (recorder) {
      try { await recorder.stop(); } catch {}
      try { (recorder as any).release?.(); } catch {}
    }

    setAudioModeAsync({
      playsInSilentMode:     true,
      interruptionMode:      'doNotMix',
      allowsRecording:       false,
      shouldPlayInBackground: false,
    }).catch(() => {});
  }

  async stopAndTranscribe(
    language: 'tw-GH' | 'en-US' | 'en-GB',
    callbacks: SpeechRecognitionCallbacks
  ): Promise<void> {
    if (this._usingFallback && this._nativeFallback) {
      return this._nativeFallback.stopListening();
    }
    if (this._stopTimer) { clearTimeout(this._stopTimer); this._stopTimer = null; }
    await this._finalize(language, callbacks);
  }

  private async _finalize(
    language: 'tw-GH' | 'en-US' | 'en-GB',
    callbacks: SpeechRecognitionCallbacks
  ): Promise<void> {
    if (this._stopTimer) { clearTimeout(this._stopTimer); this._stopTimer = null; }

    const recorder = this._recorder;
    this._recorder   = null;
    this._isListening = false;

    if (!recorder) {
      callbacks.onFinalResult({ transcript: '' });
      callbacks.onEnd?.();
      return;
    }

    try {
      await recorder.stop();
      const uri = recorder.uri;

      if (!uri) {
        callbacks.onFinalResult({ transcript: '' });
        callbacks.onEnd?.();
        return;
      }

      // Check file size — lowered threshold to 100 bytes so short words are included
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
      if (fileSize < 100) {
        console.warn('[WhisperSTT] Recorded file size is empty (0 bytes)');
        callbacks.onFinalResult({ transcript: '' });
        callbacks.onEnd?.();
        return;
      }

      // Upload to backend Whisper with 12s hard timeout
      const transcript = await this._uploadToWhisperWithTimeout(uri, language, 12000);
      callbacks.onFinalResult({ transcript });
      callbacks.onEnd?.();

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[WhisperSTT] Error during transcription:', msg);
      callbacks.onError?.(new Error(`Whisper transcription failed: ${msg}`));
    } finally {
      try { (recorder as any).release?.(); } catch {}
      setAudioModeAsync({
        playsInSilentMode:     true,
        interruptionMode:      'doNotMix',
        allowsRecording:       false,
        shouldPlayInBackground: false,
      }).catch(() => {});
    }
  }

  private async _uploadToWhisperWithTimeout(
    audioUri: string,
    language: 'tw-GH' | 'en-US' | 'en-GB',
    timeoutMs = 12000
  ): Promise<string> {
    const uploadPromise = this._uploadToWhisper(audioUri, language);
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Transcription timed out after 12s')), timeoutMs)
    );
    return Promise.race([uploadPromise, timeoutPromise]);
  }

  private async _uploadToWhisper(
    audioUri: string,
    language: 'tw-GH' | 'en-US' | 'en-GB'
  ): Promise<string> {
    const baseUrl = await getBackendUrl();
    const whisperLang: string = language === 'tw-GH' ? 'tw' : 'en';

    const result = await FileSystem.uploadAsync(
      `${baseUrl}/api/v1/stt`,
      audioUri,
      {
        httpMethod:   'POST',
        uploadType:   FileSystem.FileSystemUploadType.MULTIPART,
        fieldName:    'audio',
        mimeType:     'audio/m4a',
        parameters:   { language: whisperLang },
      }
    );

    if (result.status !== 200) {
      throw new Error(`STT server returned HTTP ${result.status}: ${result.body.slice(0, 200)}`);
    }

    const data = JSON.parse(result.body) as { text?: string; detail?: string };
    if (data.detail) throw new Error(data.detail);
    return (data.text ?? '').trim();
  }

  destroy(): void {
    if (this._stopTimer) { clearTimeout(this._stopTimer); this._stopTimer = null; }
    if (this._nativeFallback) { this._nativeFallback.destroy(); }
    const r = this._recorder;
    this._recorder    = null;
    this._isListening = false;
    if (r) { try { r.stop(); } catch {} }
  }
}
