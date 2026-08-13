// src/infrastructure/speech/ISpeechRecognitionService.ts
// Model-agnostic STT interface — implementations are fully swappable
// Supports both streaming (NativeSTT) and batch-upload (WhisperSTT) patterns.

export interface SpeechResult {
  transcript:        string;   // Final transcription text
  partialTranscript?: string;  // Streaming partial (for live subtitles)
  confidence?:       number;
  language?:         string;   // BCP-47 detected language
}

export interface SpeechRecognitionCallbacks {
  onPartialResult?: (partial: string) => void;   // Live subtitle updates
  onFinalResult:    (result: SpeechResult) => void;
  onError?:         (error: Error) => void;
  onStart?:         () => void;
  onEnd?:           () => void;
}

export interface ISpeechRecognitionService {
  readonly isAvailable: boolean;
  readonly isListening: boolean;

  /**
   * Begin listening. For streaming services (NativeSTT), speech is sent
   * incrementally. For batch services (WhisperSTT), recording starts here.
   */
  startListening(
    language: 'tw-GH' | 'en-US' | 'en-GB',
    callbacks: SpeechRecognitionCallbacks
  ): Promise<void>;

  /**
   * Stop the current recognition session.
   * For NativeSTT: stops VAD.
   * For WhisperSTT: use stopAndTranscribe() instead to get results.
   */
  stopListening(): Promise<void>;

  /**
   * Stop recording AND upload audio to get the transcript.
   * Only implemented by batch-upload services (WhisperSTT).
   * NativeSTT services can ignore this (results come via onFinalResult).
   */
  stopAndTranscribe?(
    language: 'tw-GH' | 'en-US' | 'en-GB',
    callbacks: SpeechRecognitionCallbacks
  ): Promise<void>;

  destroy(): void;
}
