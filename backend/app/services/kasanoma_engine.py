from __future__ import annotations
"""
Voxa Backend — Kasanoma Offline Twi TTS Neural Engine
Local microservice module replacing third-party HTTP calls with 100% free, local Piper ONNX inference pipeline.

Runs directly on host hardware (Apple Silicon CPU/GPU) with near-zero latency.
Preserves natural Asante/Akuapem phonetic structures (ɛ, ɔ, tw, ky, dw) instantly.
"""
import os
import re
import sys
import hashlib
import logging
import tempfile
import subprocess
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODEL_DIR = BASE_DIR / "models" / "kasanoma"
MODEL_PATH = MODEL_DIR / "kasanoma-twi.onnx"
CONFIG_PATH = MODEL_DIR / "kasanoma-twi.onnx.json"
CACHE_DIR = MODEL_DIR / "cache"

PIPER_BIN = str(BASE_DIR / "venv" / "bin" / "piper")


class KasanomaTTSEngine:
    """
    Local microservice wrapper for Kasanoma Piper ONNX Twi model.
    Zero-network dependency, 100% offline Twi speech synthesis with zero-latency WAV disk caching.
    """

    def __init__(self, model_dir: str | Path = MODEL_DIR) -> None:
        self.model_dir = Path(model_dir)
        self.model_path = self.model_dir / "kasanoma-twi.onnx"
        self.config_path = self.model_dir / "kasanoma-twi.onnx.json"
        self.cache_dir = self.model_dir / "cache"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.initialized = False

        if self.model_path.exists():
            self.initialized = True
            print(f"🚀 Kasanoma Twi Neural Voice engine initialized 100% offline ({self.model_path.name}).")
        else:
            print(f"⚠️ Kasanoma model files missing at {self.model_path}. Run setup download script first.")

    def _get_cache_path(self, twi_text: str) -> Path:
        text_hash = hashlib.md5(twi_text.strip().lower().encode("utf-8")).hexdigest()
        return self.cache_dir / f"{text_hash}.wav"

    def synthesize_twi(self, twi_text: str, output_path: str = "live_twi_vocal.wav") -> bool:
        """
        Executes local neural processing using host hardware.
        Preserves natural Asante/Akuapem phonetic structures instantly.
        """
        if not self.initialized:
            print("Fallback triggered: Kasanoma Voice engine uninitialized.")
            return False

        clean_text = twi_text.strip()
        if not clean_text:
            return False

        # 1. Check disk cache for instant zero-latency retrieval
        cache_file = self._get_cache_path(clean_text)
        if cache_file.exists() and cache_file.stat().st_size > 100:
            Path(output_path).write_bytes(cache_file.read_bytes())
            return True

        try:
            piper_exec = PIPER_BIN if Path(PIPER_BIN).exists() else "piper"

            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp_wav = tmp.name

            cmd = [
                piper_exec,
                "--model", str(self.model_path),
                "--output_file", tmp_wav
            ]
            process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            process.communicate(input=clean_text.encode("utf-8"))

            if process.returncode == 0 and Path(tmp_wav).exists() and Path(tmp_wav).stat().st_size > 100:
                wav_bytes = Path(tmp_wav).read_bytes()
                Path(output_path).write_bytes(wav_bytes)

                # Save to cache folder for sub-millisecond future requests
                cache_file.write_bytes(wav_bytes)

                Path(tmp_wav).unlink(missing_ok=True)
                return True
            else:
                Path(tmp_wav).unlink(missing_ok=True)
                return False

        except Exception as e:
            print(f"Kasanoma local processing error: {e}")
            return False

    def synthesize_twi_bytes(self, twi_text: str) -> Optional[bytes]:
        """
        Synthesizes Twi text and returns raw WAV audio bytes directly (no re-encoding overhead).
        """
        clean_text = twi_text.strip()
        if not clean_text:
            return None

        # Check disk cache
        cache_file = self._get_cache_path(clean_text)
        if cache_file.exists() and cache_file.stat().st_size > 100:
            return cache_file.read_bytes()

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_wav = tmp.name

        try:
            ok = self.synthesize_twi(clean_text, output_path=tmp_wav)
            if ok and Path(tmp_wav).exists():
                wav_bytes = Path(tmp_wav).read_bytes()
                cache_file.write_bytes(wav_bytes)
                return wav_bytes
            return None
        finally:
            Path(tmp_wav).unlink(missing_ok=True)


_kasanoma_engine: Optional[KasanomaTTSEngine] = None


def get_kasanoma_engine() -> KasanomaTTSEngine:
    global _kasanoma_engine
    if _kasanoma_engine is None:
        _kasanoma_engine = KasanomaTTSEngine()
    return _kasanoma_engine
