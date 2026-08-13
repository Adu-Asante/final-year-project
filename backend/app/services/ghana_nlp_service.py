from __future__ import annotations
"""
Voxa Backend — Ghana NLP & Abena AI / Kasanoma Integration
Dedicated service for authentic Ghanaian Twi phonology, STT, Translation, and TTS.
"""
import logging
import requests
from typing import Optional
from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Base endpoints
GHANA_NLP_BASE_URL = "https://translation-api.ghananlp.org/v1"
ABENA_AI_ENDPOINT = "https://abena.mobobi.com/api/v1/tts"


class GhanaNLPService:
    """
    Wrapper for Ghana NLP (Khaya), Abena AI, and Kasanoma Twi speech & translation services.
    Validates audio content-type to prevent HTML landing pages from masquerading as MP3 audio.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self.ghana_nlp_key: str = getattr(self.settings, "GHANA_NLP_API_KEY", "")
        self.abena_ai_key: str  = getattr(self.settings, "ABENA_AI_API_KEY", "")
        self._nlp_client = None

        if self.ghana_nlp_key:
            try:
                from ghana_nlp import GhanaNLP
                self._nlp_client = GhanaNLP(api_key=self.ghana_nlp_key)
                logger.info("✅ GhanaNLP Python SDK client initialized.")
            except Exception as e:
                logger.warning("Could not initialize GhanaNLP SDK: %s", e)

    @property
    def is_available(self) -> bool:
        return bool(self.ghana_nlp_key or self.abena_ai_key or self._nlp_client)

    def _is_valid_audio_payload(self, content: bytes, content_type: str) -> bool:
        """Strictly verifies payload is binary audio and not HTML/Text error page."""
        if not content or len(content) < 500:
            return False
        ct = content_type.lower()
        if "text/html" in ct or "text/plain" in ct or "application/json" in ct:
            return False
        if content.startswith(b"<!DOCTYPE") or content.startswith(b"<html") or content.startswith(b"{\n"):
            return False
        return True

    def translate_twi(self, text: str, direction: str = "twi_to_english") -> Optional[str]:
        """
        Translate Twi ↔ English using Option A (GhanaNLP SDK) or HTTP REST API.
        """
        if not text.strip():
            return None

        lang_pair = "tw-en" if direction == "twi_to_english" else "en-tw"

        if self._nlp_client:
            try:
                translated = self._nlp_client.translate(text, language_pair=lang_pair)
                if translated:
                    logger.info("✅ GhanaNLP SDK translated: '%s' → '%s'", text, translated)
                    return str(translated).strip()
            except Exception as e:
                logger.warning("GhanaNLP SDK translate error: %s", e)

        if self.ghana_nlp_key:
            try:
                in_lang = "tw" if direction == "twi_to_english" else "en"
                out_lang = "en" if direction == "twi_to_english" else "tw"

                url = f"{GHANA_NLP_BASE_URL}/translate"
                headers = {
                    "Ocp-Apim-Subscription-Key": self.ghana_nlp_key,
                    "Content-Type": "application/json",
                }
                body = {
                    "in": text,
                    "lang": f"{in_lang}-{out_lang}",
                }
                resp = requests.post(url, json=body, headers=headers, timeout=8)
                if resp.status_code == 200:
                    result = resp.json()
                    translated = result.get("output") or result.get("text")
                    if translated:
                        logger.info("✅ Ghana NLP REST translated: '%s' → '%s'", text, translated)
                        return translated.strip()
            except Exception as e:
                logger.warning("Ghana NLP REST translation failed: %s", e)

        return None

    def synthesize_twi_speech(self, text: str) -> Optional[bytes]:
        """
        Synthesize authentic Twi speech audio with strict audio binary validation.
        """
        clean_text = text.strip()
        if not clean_text:
            return None

        # Option A: Ghana NLP Python SDK wrapper
        if self._nlp_client:
            try:
                audio_binary = self._nlp_client.text_to_speech(clean_text, lang="tw")
                if self._is_valid_audio_payload(audio_binary, "audio/mpeg"):
                    logger.info("✅ GhanaNLP SDK synthesized %d bytes Twi audio", len(audio_binary))
                    return audio_binary
            except Exception as e:
                logger.warning("GhanaNLP SDK text_to_speech failed: %s", e)

        # Option B: Abena AI REST Pipeline
        if self.abena_ai_key:
            try:
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.abena_ai_key}",
                }
                body = {
                    "text": clean_text,
                    "language": "twi",
                    "voice_speed": 1.0,
                }
                resp = requests.post(ABENA_AI_ENDPOINT, json=body, headers=headers, timeout=8)
                ct = resp.headers.get("content-type", "")
                if resp.status_code == 200 and self._is_valid_audio_payload(resp.content, ct):
                    logger.info("✅ Abena AI REST synthesized %d bytes natural Twi audio", len(resp.content))
                    return resp.content
            except Exception as e:
                logger.warning("Abena AI REST TTS request failed: %s", e)

        # Fallback to Ghana NLP direct REST endpoint
        if self.ghana_nlp_key:
            try:
                url = f"{GHANA_NLP_BASE_URL}/tts"
                headers = {
                    "Ocp-Apim-Subscription-Key": self.ghana_nlp_key,
                    "Content-Type": "application/json",
                }
                body = {"text": clean_text, "language": "tw"}
                resp = requests.post(url, json=body, headers=headers, timeout=8)
                ct = resp.headers.get("content-type", "")
                if resp.status_code == 200 and self._is_valid_audio_payload(resp.content, ct):
                    logger.info("✅ Ghana NLP REST synthesized %d bytes Twi audio", len(resp.content))
                    return resp.content
            except Exception as e:
                logger.warning("Ghana NLP REST TTS request failed: %s", e)

        return None


_ghana_nlp_service: GhanaNLPService | None = None

def get_ghana_nlp_service() -> GhanaNLPService:
    global _ghana_nlp_service
    if _ghana_nlp_service is None:
        _ghana_nlp_service = GhanaNLPService()
    return _ghana_nlp_service
