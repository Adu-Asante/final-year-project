from __future__ import annotations
"""
Voxa Backend — Custom Voice Dataset Processor
Processes user video (.mp4, .mov) or audio (.m4a, .mp3, .wav) recordings
into LJSpeech format (22050Hz 16-bit Mono WAV + metadata.csv) for training a custom Piper/VITS Twi TTS voice.

Usage:
  1. Place raw recording files in backend/dataset/raw/
  2. Run: python -m dataset.prepare_voice_dataset
"""

import os
import sys
import argparse
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DatasetProcessor")

RAW_DIR = Path(__file__).parent / "raw"
PROCESSED_DIR = Path(__file__).parent / "processed"
WAVS_DIR = PROCESSED_DIR / "wavs"
METADATA_FILE = PROCESSED_DIR / "metadata.csv"

TARGET_SAMPLE_RATE = 22050
TARGET_CHANNELS = 1  # Mono


def check_ffmpeg() -> bool:
    """Check if ffmpeg is installed on the system."""
    import shutil
    return shutil.which("ffmpeg") is not None


def process_audio_file(input_path: Path, output_dir: Path, prefix: str = "twi") -> list[dict[str, str]]:
    """
    Extracts audio from video/audio, normalizes format to 22050Hz 16-bit PCM WAV,
    splits on silence into sentence clips, and returns manifest rows.
    """
    try:
        from pydub import AudioSegment
        from pydub.silence import split_on_silence
    except ImportError:
        logger.error("pydub missing. Install with: pip install pydub")
        sys.exit(1)

    logger.info("Processing recording: %s", input_path.name)
    
    # Load audio (pydub auto-handles mp4, mov, m4a, mp3 via ffmpeg)
    sound = AudioSegment.from_file(str(input_path))
    sound = sound.set_frame_rate(TARGET_SAMPLE_RATE).set_channels(TARGET_CHANNELS).set_sample_width(2)

    # Split audio on silence (>500ms silence below -40dBFS)
    chunks = split_on_silence(
        sound,
        min_silence_len=500,
        silence_thresh=sound.dBFS - 14,
        keep_silence=200
    )

    if not chunks:
        # If no silence detected, treat whole file as one clip
        chunks = [sound]

    manifest = []
    output_dir.mkdir(parents=True, exist_ok=True)

    for i, chunk in enumerate(chunks):
        # Ignore clips under 0.8 seconds (background noise/breaths)
        if len(chunk) < 800:
            continue

        clip_id = f"{prefix}_{input_path.stem}_{i+1:04d}"
        clip_path = output_dir / f"{clip_id}.wav"
        
        # Export as 22050Hz 16-bit WAV
        chunk.export(str(clip_path), format="wav")
        logger.info("  -> Saved clip: %s (%.2fs)", clip_path.name, len(chunk)/1000.0)

        manifest.append({
            "id": clip_id,
            "path": str(clip_path.relative_to(PROCESSED_DIR)),
            "transcript": "" # Will be populated by transcript aligner or manually
        })

    return manifest


def main():
    parser = argparse.ArgumentParser(description="Prepare voice recordings for Twi TTS training")
    parser.add_argument("--raw-dir", type=Path, default=RAW_DIR, help="Path to raw video/audio recordings")
    args = parser.parse_args()

    if not check_ffmpeg():
        logger.warning("ffmpeg command not found in PATH. Make sure ffmpeg is installed via brew install ffmpeg")

    args.raw_dir.mkdir(parents=True, exist_ok=True)
    WAVS_DIR.mkdir(parents=True, exist_ok=True)

    raw_files = [
        f for f in args.raw_dir.iterdir()
        if f.suffix.lower() in [".mp4", ".mov", ".m4a", ".mp3", ".wav", ".aac", ".flac"]
    ]

    if not raw_files:
        logger.info("No raw recordings found in: %s", args.raw_dir.absolute())
        logger.info("Drop your video/audio files in 'backend/dataset/raw/' and run this script again.")
        return

    logger.info("Found %d raw recording(s)", len(raw_files))
    all_manifest = []

    for raw_file in raw_files:
        clips = process_audio_file(raw_file, WAVS_DIR)
        all_manifest.extend(clips)

    # Write LJSpeech metadata.csv headerless: clip_id|transcript|normalized_transcript
    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        for row in all_manifest:
            f.write(f"{row['id']}|{row['transcript']}|{row['transcript']}\n")

    logger.info("✅ Dataset preparation complete!")
    logger.info("Total clips created: %d in %s", len(all_manifest), WAVS_DIR.absolute())
    logger.info("Metadata manifest written to: %s", METADATA_FILE.absolute())


if __name__ == "__main__":
    main()
