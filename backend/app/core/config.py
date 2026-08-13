from __future__ import annotations
"""
Voxa Backend — Core Configuration
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────────────────────────
    APP_NAME: str = "Voxa AI Interpreter"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["*"]  # Tighten in production

    # ── Translation ───────────────────────────────────────────────────────────
    TRANSLATION_MODEL_ID: str = "facebook/nllb-200-distilled-600M"
    MAX_TRANSLATION_LENGTH: int = 512

    # Language codes for NLLB-200
    TWI_LANG_CODE: str = "aka_Latn"  # Akan / Twi
    ENGLISH_LANG_CODE: str = "eng_Latn"

    # ── Specialized Ghanaian NLP / Abena AI Keys ──────────────────────────────
    GHANA_NLP_API_KEY: str = ""  # Ghana NLP (Khaya API) Key
    ABENA_AI_API_KEY: str  = ""  # Abena AI Developer API Key

    # ── STT ───────────────────────────────────────────────────────────────────
    STT_MODEL_ID: str = "openai/whisper-tiny"
    STT_DEVICE: str = "cpu"
    STT_COMPUTE_TYPE: str = "int8"

    # ── TTS ───────────────────────────────────────────────────────────────────
    TTS_VOICE: str = "en_US-lessac-medium"

    # ── Paths ─────────────────────────────────────────────────────────────────
    MODELS_DIR: Path = BASE_DIR / "models"
    TEMP_DIR: Path = BASE_DIR / "tmp"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
