from __future__ import annotations
"""
Voxa Backend — OCR API endpoint
Receives an image file, runs Tesseract (English + Twi via Latin script),
returns extracted text.
"""
import io
import logging

from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)
router = APIRouter(tags=["OCR"])


def _run_tesseract(image_bytes: bytes) -> str:
    """Lazy-import pytesseract + PIL so the server boots without them."""
    try:
        import pytesseract
        from PIL import Image
    except ImportError as e:
        raise RuntimeError(
            "OCR dependencies missing. Run: pip install pytesseract Pillow"
        ) from e

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # Try Twi + English language pack; fall back to English-only if pack missing
    try:
        text = pytesseract.image_to_string(img, lang="aka+eng")
    except pytesseract.TesseractError:
        text = pytesseract.image_to_string(img, lang="eng")

    return text.strip()


@router.post("/ocr")
async def ocr_image(file: UploadFile = File(...)) -> JSONResponse:
    """
    Extract text from an image using Tesseract OCR.

    - Accepts JPEG / PNG / WebP
    - Returns {text: string}
    """
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="File must be an image")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        text = _run_tesseract(image_bytes)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        logger.exception("OCR failed: %s", e)
        raise HTTPException(status_code=500, detail="OCR processing failed") from e

    logger.info("OCR extracted %d chars", len(text))
    return JSONResponse({"text": text})
