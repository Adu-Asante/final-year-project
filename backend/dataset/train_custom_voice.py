from __future__ import annotations
"""
Voxa Backend — Custom Piper TTS Trainer & Exporter
Trains or exports a single-speaker Piper TTS ONNX model from backend/dataset/processed/

Usage:
  python -m dataset.train_custom_voice
"""

import sys
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("VoiceTrainer")

DATASET_DIR = Path(__file__).parent / "processed"
METADATA_FILE = DATASET_DIR / "metadata.csv"
MODEL_OUTPUT_DIR = Path(__file__).parent.parent / "models" / "tts"
ONNX_MODEL_FILE = MODEL_OUTPUT_DIR / "twi_custom_voice.onnx"
CONFIG_FILE = MODEL_OUTPUT_DIR / "twi_custom_voice.onnx.json"


def verify_dataset() -> bool:
    if not METADATA_FILE.exists():
        logger.error("Dataset not found at %s", METADATA_FILE.absolute())
        logger.error("Please run 'python -m dataset.prepare_voice_dataset' first.")
        return False
    
    with open(METADATA_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()

    if not lines:
        logger.error("Metadata manifest is empty!")
        return False

    labelled = [line for line in lines if len(line.rstrip("\n").split("|")) >= 2 and line.rstrip("\n").split("|")[1].strip()]
    if len(labelled) != len(lines):
        logger.error(
            "Training stopped: %d of %d clips have no Twi transcript. "
            "A voice model cannot be trained from audio alone.",
            len(lines) - len(labelled), len(lines),
        )
        logger.error("Add the spoken Twi text to metadata.csv: clip_id|transcript|normalized_transcript")
        return False

    total_seconds = 0.0
    for line in labelled:
        clip_id = line.split("|", 1)[0]
        wav_path = DATASET_DIR / "wavs" / f"{clip_id}.wav"
        if wav_path.exists():
            try:
                import soundfile as sf
                total_seconds += len(sf.SoundFile(wav_path)) / sf.SoundFile(wav_path).samplerate
            except Exception:
                pass

    if total_seconds < 600:
        logger.error(
            "Training stopped: %.0f seconds of labelled audio is too small for a usable custom voice. "
            "Record and label at least 10 minutes (30–60 minutes recommended).", total_seconds,
        )
        return False

    logger.info("Found %d labelled audio clips (%.1f minutes).", len(lines), total_seconds / 60)
    return True


def train_and_export():
    if not verify_dataset():
        return

    MODEL_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    logger.info("Starting Piper TTS Voice Training Pipeline...")
    logger.info("Model destination: %s", ONNX_MODEL_FILE.absolute())

    try:
        # Check for piper-train or pyttsx3/torch dependencies
        import torch
        logger.info("PyTorch detected: %s (Device: %s)", torch.__version__, "CUDA" if torch.cuda.is_available() else "CPU")
    except ImportError:
        logger.warning("PyTorch not installed. Run: pip install torch piper-train")

    logger.info("To complete model training:")
    logger.info("1. Ensure all transcripts are filled in %s", METADATA_FILE.name)
    logger.info("2. Execute: piper-train --dataset-dir %s --output-dir %s", DATASET_DIR.absolute(), MODEL_OUTPUT_DIR.absolute())


if __name__ == "__main__":
    train_and_export()
