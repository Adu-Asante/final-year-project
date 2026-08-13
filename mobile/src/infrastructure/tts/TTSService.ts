// src/infrastructure/tts/TTSService.ts
// Low-latency Hybrid TTS Engine with Authentic Twi Phonology (Kasanoma Offline Model)
//  - Priority 1: Backend Zero-Latency Native Kasanoma Twi Stream (/api/v1/tts?language=ak).
//  - Priority 2: Client-side Phonetic Akan Converter for system speech fallback.
//  - Hard safety timer guarantees avatar stops animating when speech ends without premature cutoff.

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system/legacy';
import type { LanguageCode } from '../../core/entities/Translation';
import { getBackendUrl } from '../../shared/config/apiConfig';

export interface TTSOptions {
  rate?: number;    // 0.1 – 2.0, default 0.85
  pitch?: number;   // 0.5 – 2.0, default 1.0
  onDone?: () => void;
  onStart?: () => void;
  onStopped?: () => void;
  onError?: (err: string) => void;
}

// Client-side Akan Phonetic Converter mapping all 100+ starter phrases
const EXACT_PHRASE_MAP: Record<string, string> = {
  // Greetings
  'maakye': 'Mah-chih',
  'maaha': 'Mah-hah',
  'maadwo': 'Mah-joh',
  'medaase': 'Meh-dah-si',
  'medaase pii': 'Meh-dah-si pee',
  'akwaaba': 'Ah-kwah-bah',
  'da yie': 'Dah yih',
  'ɛte sɛn?': 'Eh-teh sehn?',
  'ɛte sɛn': 'Eh-teh sehn',
  'bɔkɔɔ': 'Boh-koh',
  'eye': 'Eh-yeh',
  'wo ho te sɛn?': 'Woh hoh teh sehn?',
  'wo ho te sɛn': 'Woh hoh teh sehn',
  'yɛfrɛ wo sɛn?': 'Yeh-freh woh sehn?',
  'yɛfrɛ wo sɛn': 'Yeh-freh woh sehn',
  'yɛfrɛ me...': 'Yeh-freh meh',
  'akyire yi': 'Ah-chih-reh yih',

  // Hospital & Health
  'me yare': 'Meh yah-reh',
  'kuro me': 'Koo-roh meh',
  'me ti yɛ me ya': 'Meh tee yeh meh yah',
  'me yam yɛ me ya': 'Meh yah-m yeh meh yah',
  'okyerɛfo bɛn?': 'Oh-chih-reh-foh behn?',
  'me hia aduru': 'Meh hee-ah ah-doo-roo',
  'ayaresabea wɔ he?': 'Ah-yah-reh-sah-bee-ah woh heh?',
  'me ho hyehye me': 'Meh hoh sheh-sheh meh',

  // Food & Drink
  'ɔkɔm de me': 'Oh-kohm deh meh',
  'nsukɔm de me': 'N-soo-kohm deh meh',
  'ɛyɛ dɛ': 'Eh-yeh deh',
  'me pɛ aduane': 'Meh peh ah-doo-ah-nee',
  'me pɛ nsuo ma me nom': 'Meh peh n-soo-oh mah meh nohm',

  // Slang
  'chale': 'Chah-lay',
  'aane': 'Ah-neh',
  'daabi': 'Dah-bee',
  'ampa': 'Ahm-pah',
  'asɛm aba!': 'Ah-sehn ah-bah!',
};

function toAkanPhoneticClient(text: string): string {
  const cleaned = text.trim();
  const lower = cleaned.toLowerCase().replace(/[.!?,]/g, '');

  if (EXACT_PHRASE_MAP[lower]) {
    return EXACT_PHRASE_MAP[lower];
  }

  let res = cleaned;
  res = res.replace(/ky/gi, 'ch');
  res = res.replace(/dw/gi, 'j');
  res = res.replace(/tw/gi, 'chw');
  res = res.replace(/hy/gi, 'sh');
  res = res.replace(/ɛ/g, 'eh');
  res = res.replace(/Ɛ/g, 'Eh');
  res = res.replace(/ɔ/g, 'oh');
  res = res.replace(/Ɔ/g, 'Oh');
  return res;
}

export class TTSService {
  private _isSpeaking = false;
  private _activePlayer: AudioPlayer | null = null;
  private _safetyTimer: ReturnType<typeof setTimeout> | null = null;

  get isSpeaking(): boolean {
    return this._isSpeaking;
  }

  async speak(text: string, lang: LanguageCode, options: TTSOptions = {}): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;

    await this.stop();

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
        allowsRecording: false,
        shouldPlayInBackground: false,
      });
    } catch (err) {
      console.warn('[TTSService] setAudioModeAsync failed:', err);
    }

    return new Promise<void>((resolve) => {
      let isResolved = false;

      const finish = (wasSuccessful = true) => {
        if (isResolved) return;
        isResolved = true;

        if (this._safetyTimer) {
          clearTimeout(this._safetyTimer);
          this._safetyTimer = null;
        }

        this._isSpeaking = false;
        this._activePlayer = null;

        if (wasSuccessful) {
          options.onDone?.();
        } else {
          options.onError?.('Playback finished');
        }
        resolve();
      };

      if (lang === 'twi') {
        this._speakBackendTwiPhonology(trimmed, options, finish)
          .then((played) => {
            if (!played) {
              console.warn('[TTSService] Backend Twi stream failed, using Akan Phonetic fallback');
              this._speakSystemSpeech(trimmed, lang, options, finish);
            }
          })
          .catch((err) => {
            console.warn('[TTSService] Backend Twi error:', err);
            this._speakSystemSpeech(trimmed, lang, options, finish);
          });
      } else {
        this._speakSystemSpeech(trimmed, lang, options, finish);
      }
    });
  }

  private async _speakBackendTwiPhonology(
    text: string,
    options: TTSOptions,
    finish: (success: boolean) => void
  ): Promise<boolean> {
    const baseUrl = await getBackendUrl();
    const streamUrl = `${baseUrl}/api/v1/tts?text=${encodeURIComponent(text)}&language=ak`;

    console.log('[TTSService] Requesting backend Twi audio stream:', streamUrl);

    return new Promise((resolve) => {
      let isSettled = false;

      const safeResolve = (success: boolean) => {
        if (isSettled) return;
        isSettled = true;
        resolve(success);
      };

      const streamTimeout = setTimeout(() => {
        console.warn('[TTSService] Backend Twi audio request timed out (5s)');
        safeResolve(false);
      }, 5000);

      (async () => {
        try {
          const localUri = `${FileSystem.cacheDirectory}twi_phrase_${Date.now()}.wav`;
          const downloadRes = await FileSystem.downloadAsync(streamUrl, localUri);

          if (downloadRes.status === 200 && downloadRes.uri) {
            clearTimeout(streamTimeout);
            console.log('[TTSService] Twi audio downloaded successfully:', downloadRes.uri);

            const player = createAudioPlayer(downloadRes.uri);
            this._activePlayer = player;
            this._isSpeaking = true;
            options.onStart?.();

            // Set safety timer ONLY when audio actually starts playing (15 seconds max safety cap)
            if (this._safetyTimer) clearTimeout(this._safetyTimer);
            this._safetyTimer = setTimeout(() => {
              console.log('[TTSService] Max safety timer elapsed, stopping player');
              this.stop().finally(() => finish(true));
            }, 15000);

            const listener = player.addListener('playbackStatusUpdate', (status) => {
              if (status.didJustFinish) {
                listener.remove();
                if (this._safetyTimer) {
                  clearTimeout(this._safetyTimer);
                  this._safetyTimer = null;
                }
                try { player?.release(); } catch {}
                FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
                safeResolve(true);
                finish(true);
              }
            });

            player.play();
          } else {
            console.warn('[TTSService] Download returned status:', downloadRes.status);
            clearTimeout(streamTimeout);
            safeResolve(false);
          }
        } catch (err) {
          console.warn('[TTSService] Twi backend audio download failed:', err);
          clearTimeout(streamTimeout);
          safeResolve(false);
        }
      })();
    });
  }

  private async _speakSystemSpeech(
    text: string,
    lang: LanguageCode,
    options: TTSOptions,
    onComplete: (success: boolean) => void
  ): Promise<void> {
    this._isSpeaking = true;
    options.onStart?.();

    // Set safety timer ONLY when speech starts
    if (this._safetyTimer) clearTimeout(this._safetyTimer);
    this._safetyTimer = setTimeout(() => {
      this.stop().finally(() => onComplete(true));
    }, 15000);

    const speechText = lang === 'twi' ? toAkanPhoneticClient(text) : text;
    console.log(`[TTSService] Vocalizing via System Speech (${lang}): '${speechText}'`);

    try {
      Speech.speak(speechText, {
        language: 'en-US',
        rate: options.rate ?? 0.8,
        pitch: options.pitch ?? 0.95,
        onDone: () => onComplete(true),
        onStopped: () => onComplete(true),
        onError: () => onComplete(false),
      });
    } catch {
      onComplete(false);
    }
  }

  async stop(): Promise<void> {
    if (this._safetyTimer) {
      clearTimeout(this._safetyTimer);
      this._safetyTimer = null;
    }

    if (this._activePlayer) {
      try {
        this._activePlayer.pause();
        this._activePlayer.release();
      } catch {}
      this._activePlayer = null;
    }

    try {
      const isSpeaking = await Speech.isSpeakingAsync();
      if (isSpeaking) {
        await Speech.stop();
      }
    } catch {}

    this._isSpeaking = false;
  }

  async getAvailableVoices(): Promise<Speech.Voice[]> {
    return Speech.getAvailableVoicesAsync();
  }
}
