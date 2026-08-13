// src/infrastructure/translation/NLLBTranslationService.ts
// HTTP client calling the FastAPI /api/v1/translate endpoint
// Uses apiConfig for a runtime-configurable base URL (works on physical devices)

import axios, { AxiosInstance } from 'axios';
import type { ITranslationService } from '../../core/usecases/TranslateUseCase';
import { getBackendUrl } from '../../shared/config/apiConfig';

export class NLLBTranslationService implements ITranslationService {
  private _client: AxiosInstance | null = null;

  private async client(): Promise<AxiosInstance> {
    if (this._client) return this._client;
    const baseURL = await getBackendUrl();
    this._client = axios.create({
      baseURL,
      timeout: 20000,
      headers: { 'Content-Type': 'application/json' },
    });
    return this._client;
  }

  /** Call this when the user changes the backend URL in Settings */
  invalidate(): void {
    this._client = null;
  }

  async translate(
    text: string,
    direction: 'twi_to_english' | 'english_to_twi'
  ): Promise<string> {
    const c = await this.client();
    const response = await c.post<{ translated_text: string }>(
      '/api/v1/translate',
      { text, direction }
    );
    return response.data.translated_text;
  }

  async translateWithAudio(
    text: string,
    direction: 'twi_to_english' | 'english_to_twi'
  ): Promise<{ translatedText: string; audioBase64: string | null }> {
    const c = await this.client();
    const response = await c.post<{
      translated_text: string;
      audio_base64: string | null;
    }>('/api/v1/pipeline', { text, direction, include_audio: true });
    return {
      translatedText: response.data.translated_text,
      audioBase64:    response.data.audio_base64,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const c = await this.client();
      await c.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  /** OCR: send image URI to backend, returns detected text */
  async ocrImage(imageUri: string): Promise<string> {
    const c = await this.client();

    const formData = new FormData();
    formData.append('file', {
      uri:  imageUri,
      type: 'image/jpeg',
      name: 'ocr.jpg',
    } as unknown as Blob);

    const response = await c.post<{ text: string }>(
      '/api/v1/ocr',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data.text;
  }
}
