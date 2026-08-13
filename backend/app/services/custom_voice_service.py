from __future__ import annotations
"""
Voxa Backend — Custom Voice & Exact Audio Resolver
Maps translation texts to user's authentic native voice recordings for 100% exact pronunciation,
and falls back to custom trained neural voice synthesis.
"""

import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

DATASET_WAVS_DIR = Path(__file__).parent.parent.parent / "dataset" / "processed" / "wavs"
MANIFEST_FILE = Path(__file__).parent.parent.parent / "dataset" / "processed" / "metadata.csv"


class CustomVoiceResolver:
    """
    Resolves audio for text using user's exact recorded clips.
    """

    def __init__(self):
        self._audio_map: dict[str, Path] = {}
        self._load_manifest()

    def _load_manifest(self):
        """Loads metadata.csv mappings if present."""
        if not MANIFEST_FILE.exists():
            return
        
        try:
            with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                for line in f:
                    parts = line.strip().split("|")
                    if len(parts) >= 1 and parts[0]:
                        clip_id = parts[0]
                        wav_path = DATASET_WAVS_DIR / f"{clip_id}.wav"
                        text = parts[1].strip().lower() if len(parts) > 1 else ""
                        
                        if wav_path.exists() and text:
                            self._audio_map[text] = wav_path
        except Exception as e:
            logger.warning("Failed loading voice manifest: %s", e)

    def find_exact_recording(self, text: str) -> bytes | None:
        """
        Checks if an exact native audio recording exists for this text.
        Returns WAV/audio bytes if found, or None.
        """
        clean_text = text.strip().lower()
        if clean_text in self._audio_map:
            logger.info("🎯 Found exact native voice recording for: '%s'", text)
            return self._audio_map[clean_text].read_bytes()
        
        # Check if any recorded clip file matches
        if DATASET_WAVS_DIR.exists():
            for wav_file in DATASET_WAVS_DIR.glob("*.wav"):
                # If text is in filename or matches
                if clean_text in wav_file.stem.lower():
                    logger.info("🎯 Found matching native recording file: %s", wav_file.name)
                    return wav_file.read_bytes()
                    
        return None


_resolver: CustomVoiceResolver | None = None

def get_voice_resolver() -> CustomVoiceResolver:
    global _resolver
    if _resolver is None:
        _resolver = CustomVoiceResolver()
    return _resolver
