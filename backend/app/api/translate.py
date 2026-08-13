from __future__ import annotations
"""
Voxa Backend — Translation API Router
POST /api/v1/translate
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Literal

from app.services.nllb_service import NLLBTranslationService, get_translation_service

router = APIRouter(prefix="/translate", tags=["Translation"])

Direction = Literal["twi_to_english", "english_to_twi", "auto"]


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1024, description="Text to translate")
    direction: Direction = Field("auto", description="Translation direction")
    source_lang: str | None = Field(None, description="Detected source language (BCP-47)")


class TranslateResponse(BaseModel):
    source_text: str
    translated_text: str
    source_lang: str
    target_lang: str
    direction: Direction


@router.post("", response_model=TranslateResponse)
async def translate(
    req: TranslateRequest,
    svc: NLLBTranslationService = Depends(get_translation_service),
) -> TranslateResponse:
    """
    Translate text between Twi (Akan) and English.

    Direction auto-detects based on source_lang hint:
    - "tw" or "ak" → Twi to English
    - "en"          → English to Twi
    - explicit direction overrides auto
    """
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    # Resolve direction
    direction = req.direction
    if direction == "auto":
        lang = (req.source_lang or "").lower()
        if lang in ("tw", "ak", "aka"):
            direction = "twi_to_english"
        else:
            direction = "english_to_twi"

    try:
        if direction == "twi_to_english":
            result = svc.twi_to_english(text)
            src_lang, tgt_lang = "aka_Latn", "eng_Latn"
        else:
            result = svc.english_to_twi(text)
            src_lang, tgt_lang = "eng_Latn", "aka_Latn"
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Translation failed: {exc}")

    return TranslateResponse(
        source_text=text,
        translated_text=result,
        source_lang=src_lang,
        target_lang=tgt_lang,
        direction=direction,
    )
