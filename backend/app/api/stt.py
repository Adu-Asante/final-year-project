from __future__ import annotations
"""
Voxa Backend — STT API (Primary)
POST /api/v1/stt

Mobile app records audio with expo-audio, POSTs here.
Whisper transcribes and returns text.
Handles: m4a, mp4, wav, ogg, webm.
"""
import mimetypes
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.services.stt_service import STTService, get_stt_service

router = APIRouter(prefix="/stt", tags=["Speech Recognition"])

MIME_TO_EXT = {
    "audio/m4a":       ".m4a",
    "audio/x-m4a":    ".m4a",
    "audio/mp4":       ".mp4",
    "audio/mpeg":      ".mp3",
    "audio/wav":       ".wav",
    "audio/x-wav":     ".wav",
    "audio/ogg":       ".ogg",
    "audio/webm":      ".webm",
    "video/mp4":       ".mp4",   # some devices send m4a as video/mp4
}


class STTResponse(BaseModel):
    text:     str
    language: str
    segments: list[dict]


@router.post("", response_model=STTResponse)
async def transcribe(
    audio:    UploadFile = File(..., description="Audio file (m4a, wav, mp4, ogg)"),
    language: str | None = Form(None, description="Language hint: 'tw' (Twi), 'en' (English), or null for auto-detect"),
    svc:      STTService = Depends(get_stt_service),
) -> STTResponse:
    """
    Transcribe audio using server-side faster-whisper.
    Primary STT endpoint — called by the Voxa mobile app on every voice input.

    - language='tw'   → Whisper uses Akan/Twi transcription mode
    - language='en'   → English transcription mode
    - language=null   → Auto-detect (slower but works for mixed speech)
    """
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file is empty")

    # Determine file extension from MIME type for correct ffmpeg decoding
    mime_type    = audio.content_type or "audio/m4a"
    file_ext     = MIME_TO_EXT.get(mime_type, ".m4a")

    # Also try to get extension from filename if available
    if audio.filename and "." in audio.filename:
        file_ext = "." + audio.filename.rsplit(".", 1)[-1].lower()

    try:
        result = svc.transcribe(
            audio_bytes,
            language=language,
            file_extension=file_ext,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}")

    return STTResponse(**result)
