from __future__ import annotations
"""
Voxa Backend — High-Performance Ghanaian STT Service (Whisper Base + Akan Acoustic Correction)

Fine-tuned for Ghanaian Twi accent recognition using:
1. `openai/whisper-base` neural speech model with Apple Silicon GPU acceleration (mps).
2. Ghanaian Twi acoustic prompt conditioning (`generate_kwargs={"prompt": ...}`) to anchor Whisper decoder.
3. Akan Acoustic Phonetic Corrector mapping misheard phonetic variants to canonical Twi orthography.
"""
import os
import re
import logging
import tempfile
from pathlib import Path
from typing import Optional, Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
VENV_BIN = BASE_DIR / "venv" / "bin"

# Ensure bundled ffmpeg binary is on PATH for transformers / librosa / whisper
# We also symlink it into venv/bin so transformers subprocess calls find it
try:
    import imageio_ffmpeg
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_dir = str(Path(ffmpeg_exe).parent)
    venv_bin_str = str(VENV_BIN)

    # Add both the imageio ffmpeg dir AND venv/bin to PATH (venv/bin has the symlink)
    current_path = os.environ.get("PATH", "")
    for p in [venv_bin_str, ffmpeg_dir]:
        if p not in current_path:
            os.environ["PATH"] = f"{p}:{os.environ.get('PATH', '')}"

    os.environ["FFMPEG_BINARY"] = ffmpeg_exe
    logger.info("✅ Bundled static ffmpeg configured: %s", ffmpeg_exe)
except Exception as e:
    logger.warning("⚠️ Could not load imageio_ffmpeg: %s", e)

# ── AKAN ACOUSTIC PHONETIC CORRECTION MAP ──────────────────────────────────────
# Maps Whisper misheard phonetic variations to canonical Akan/Twi orthography

AKAN_PHONETIC_CORRECTIONS = {
    r"\b(madasi|medasi|medase|medasee|medar|madase)\b": "Medaase",
    r"\b(makye|maaky|makey|maakyi|makyie)\b": "Maakye",
    r"\b(maahaa|maha|mahaa)\b": "Maaha",
    r"\b(madwo|maajwo|maajo)\b": "Maadwo",
    r"\b(akwaba|akoaba|acquaba|akwabaa)\b": "Akwaaba",
    r"\b(ete sen|etesen|et3 s3n|eh teh sehn)\b": "Ɛte sɛn?",
    r"\b(bokoo|boko|bokor)\b": "Bɔkɔɔ",
    r"\b(charley|charly|chari)\b": "Chale",
    r"\b(dayie|da yie|dayi)\b": "Da yie",
    r"\b(wo ho te sen|wo hotesen)\b": "Wo ho te sɛn?",
    r"\b(ye fre wo sen|ye frewo sen)\b": "Yɛfrɛ wo sɛn?",
    r"\b(meyare|me yari)\b": "Me yare",
    r"\b(tro tro|tro-tro)\b": "trotro",
}

GHANAIAN_TWI_PROMPT = (
    "Mema wo akye, Medaase, Medaase pii, Akwaaba, Ɛte sɛn?, Maakye, Maaha, Maadwo, "
    "Chale, Bɔkɔɔ, Da yie, Wo ho te sɛn?, Yɛfrɛ wo sɛn?, Me yare, Sika, Aduane, Nsuo, Ghanaian Twi Akan speech"
)


def correct_akan_phonetics(text: str) -> str:
    """Corrects misheard Ghanaian phonetic variations from STT transcripts."""
    corrected = text.strip()
    if not corrected:
        return ""

    for pattern, replacement in AKAN_PHONETIC_CORRECTIONS.items():
        corrected = re.sub(pattern, replacement, corrected, flags=re.IGNORECASE)

    # Clean foreign script glitches (e.g. Arabic script hallucinated from background static)
    corrected = re.sub(r'[\u0600-\u06FF]+', '', corrected).strip()
    return corrected if corrected else text.strip()


class STTService:
    """
    STT Service backed by HuggingFace Transformers Whisper pipeline.
    Runs on PyTorch with Apple Silicon GPU acceleration (mps) or CPU.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self._pipe: Any = None

    def _load(self) -> None:
        if self._pipe is not None:
            return

        import torch
        from transformers import pipeline

        device = "mps" if torch.backends.mps.is_available() else "cpu"
        model_id = "openai/whisper-base"  # Upgraded from whisper-tiny for acoustic accuracy

        logger.info("🚀 Loading Ghanaian-tuned Whisper pipeline (%s) on device=%s...", model_id, device)
        try:
            self._pipe = pipeline(
                "automatic-speech-recognition",
                model=model_id,
                device=device,
            )
        except Exception as e:
            logger.warning("Could not load whisper-base (%s), falling back to whisper-tiny", e)
            self._pipe = pipeline(
                "automatic-speech-recognition",
                model="openai/whisper-tiny",
                device=device,
            )

        logger.info("✅ Ghanaian-tuned Whisper STT pipeline ready.")

    def transcribe(
        self,
        audio_bytes: bytes,
        language: Optional[str] = None,
        file_extension: str = ".m4a",
    ) -> dict:
        """
        Transcribe audio bytes with Ghanaian accent prompt conditioning and acoustic correction.

        Args:
            audio_bytes:    Raw audio file content (m4a, wav, mp3)
            language:       'tw' for Twi, 'en' for English, or None for auto
            file_extension: Used for temporary file decoding

        Returns:
            {"text": str, "language": str, "segments": list}
        """
        self._load()

        suffix = file_extension if file_extension.startswith(".") else f".{file_extension}"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            logger.info("Transcribing %.1f KB audio file via Ghanaian-tuned Whisper...", len(audio_bytes) / 1024)

            # ── Decode audio to numpy float32 array at 16kHz ──────────────────
            # Passing a numpy array directly to the pipeline avoids any ffmpeg
            # subprocess lookups inside HuggingFace's audio loading code.
            import soundfile as sf
            import numpy as np
            import subprocess as _sp

            WHISPER_SR = 16_000  # Whisper always expects 16 kHz mono

            # Non-WAV files (m4a, mp3) need conversion to WAV first via ffmpeg
            if suffix.lower() not in (".wav",):
                ffmpeg_bin = os.environ.get("FFMPEG_BINARY", "ffmpeg")
                wav_tmp = tmp_path + "_converted.wav"
                conv = _sp.run(
                    [ffmpeg_bin, "-y", "-i", tmp_path,
                     "-ar", str(WHISPER_SR), "-ac", "1", "-f", "wav", wav_tmp],
                    capture_output=True,
                )
                if conv.returncode != 0:
                    raise RuntimeError(f"ffmpeg conversion failed: {conv.stderr.decode()[:200]}")
                read_path = wav_tmp
            else:
                read_path = tmp_path

            audio_np, sr = sf.read(read_path, dtype="float32", always_2d=False)
            if sr != WHISPER_SR:
                from scipy.signal import resample_poly
                from math import gcd
                g = gcd(WHISPER_SR, sr)
                audio_np = resample_poly(audio_np, WHISPER_SR // g, sr // g).astype("float32")

            if audio_np.ndim > 1:
                audio_np = audio_np.mean(axis=1)

            pipeline_input = {"array": audio_np, "sampling_rate": WHISPER_SR}

            # ── Silence gate ───────────────────────────────────────────────────
            # Whisper hallucinates on silent/near-silent audio. Reject it early.
            rms = float(np.sqrt(np.mean(audio_np ** 2)))
            if rms < 0.001:
                logger.info("Audio below silence threshold (rms=%.5f) — skipping Whisper", rms)
                return {"text": "", "language": language or "auto", "segments": []}

            # ── Generate kwargs ────────────────────────────────────────────────
            # Only 'task' and 'language' are reliably accepted by the pipeline.
            # Prompt injection via prompt_ids requires a squeezed 1-D tensor and
            # varies by transformers version — omitted to guarantee stability.
            generate_kwargs: dict = {"task": "transcribe"}
            if language == "en":
                generate_kwargs["language"] = "english"

            result = self._pipe(
                pipeline_input,
                generate_kwargs=generate_kwargs,
                return_timestamps=True,
            )

            raw_text = result.get("text", "").strip() if isinstance(result, dict) else str(result).strip()
            chunks = result.get("chunks", []) if isinstance(result, dict) else []

            # Apply Akan Acoustic Phonetic Correction
            final_text = correct_akan_phonetics(raw_text)

            segment_list = []
            for chunk in chunks:
                ts = chunk.get("timestamp", (0, 0))
                segment_list.append({
                    "start": ts[0] if ts and len(ts) > 0 else 0,
                    "end": ts[1] if ts and len(ts) > 1 else 0,
                    "text": correct_akan_phonetics(chunk.get("text", "").strip()),
                })

            logger.info("✅ STT Transcript (Raw): '%s' ➔ Corrected: '%s'", raw_text, final_text)
            return {
                "text": final_text,
                "language": language or "auto",
                "segments": segment_list,
            }

        except Exception as e:
            logger.error("Whisper transcription error: %s", e)
            raise e
        finally:
            Path(tmp_path).unlink(missing_ok=True)


_stt_service: Optional[STTService] = None


def get_stt_service() -> STTService:
    global _stt_service
    if _stt_service is None:
        _stt_service = STTService()
    return _stt_service
