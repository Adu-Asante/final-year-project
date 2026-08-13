from __future__ import annotations
"""
Voxa Backend — Pipeline API
POST /api/v1/pipeline
Full chain: text → translate → speak (returns translated text + audio)
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Literal
import base64

from app.services.nllb_service import NLLBTranslationService, get_translation_service
from app.services.tts_service import TTSService, get_tts_service

router = APIRouter(prefix="/pipeline", tags=["Pipeline"])

Direction = Literal["twi_to_english", "english_to_twi", "auto"]


class PipelineRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=512)
    direction: Direction = Field("auto")
    source_lang: str | None = Field(None)
    include_audio: bool = Field(True, description="Return base64 TTS audio")


class PipelineResponse(BaseModel):
    source_text: str
    translated_text: str
    direction: Direction
    audio_base64: str | None  # MP3 bytes as base64


@router.post("", response_model=PipelineResponse)
async def pipeline(
    req: PipelineRequest,
    trans_svc: NLLBTranslationService = Depends(get_translation_service),
    tts_svc: TTSService = Depends(get_tts_service),
) -> PipelineResponse:
    """
    Full interpreter pipeline:
    1. Translate text (NLLB-200)
    2. Synthesize translated text to speech
    3. Return both translated text and audio (base64 MP3)
    """
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    # Resolve direction
    direction = req.direction
    if direction == "auto":
        lang = (req.source_lang or "").lower()
        direction = "twi_to_english" if lang in ("tw", "ak", "aka") else "english_to_twi"

    # Step 1: Translate
    try:
        if direction == "twi_to_english":
            translated = trans_svc.twi_to_english(text)
            tts_lang = "en"
        else:
            translated = trans_svc.english_to_twi(text)
            tts_lang = "ak"
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Translation error: {exc}")

    # Step 2: TTS
    audio_b64 = None
    if req.include_audio:
        try:
            audio_bytes = tts_svc.synthesize(translated, language=tts_lang)
            audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        except Exception as exc:
            # Non-fatal — return translation without audio
            pass

    return PipelineResponse(
        source_text=text,
        translated_text=translated,
        direction=direction,
        audio_base64=audio_b64,
    )
