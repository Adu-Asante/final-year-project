from __future__ import annotations
"""
Voxa Backend — TTS API
POST /api/v1/tts & GET /api/v1/tts
Returns audio/mpeg stream.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import io

from app.services.tts_service import TTSService, get_tts_service

router = APIRouter(prefix="/tts", tags=["Text-to-Speech"])


def _audio_response(audio_bytes: bytes) -> StreamingResponse:
    """Preserve the format of exact native recordings as well as synthesized MP3."""
    is_wav = audio_bytes.startswith(b"RIFF") and audio_bytes[8:12] == b"WAVE"
    is_aiff = audio_bytes.startswith(b"FORM") and audio_bytes[8:12] in (b"AIFF", b"AIFC")
    media_type = "audio/wav" if is_wav else "audio/aiff" if is_aiff else "audio/mpeg"
    extension = "wav" if is_wav else "aiff" if is_aiff else "mp3"
    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type=media_type,
        headers={"Content-Disposition": f"inline; filename=voxa_tts.{extension}"},
    )


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=512)
    language: str = Field("en", description="BCP-47 language code: 'en' or 'ak'")
    voice: str | None = Field(None, description="Reserved for future voice selection")


@router.post("")
async def synthesize(
    req: TTSRequest,
    svc: TTSService = Depends(get_tts_service),
) -> StreamingResponse:
    """
    Convert text to speech audio (MP3).
    language: 'en' for English, 'ak' for Twi/Akan
    """
    try:
        audio_bytes = svc.synthesize(req.text, language=req.language)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {exc}")

    return _audio_response(audio_bytes)


@router.get("")
async def synthesize_get(
    text: str,
    language: str = "ak",
    svc: TTSService = Depends(get_tts_service),
) -> StreamingResponse:
    """
    GET endpoint for streaming audio directly to mobile Audio player / URL.
    """
    try:
        audio_bytes = svc.synthesize(text, language=language)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {exc}")

    return _audio_response(audio_bytes)
