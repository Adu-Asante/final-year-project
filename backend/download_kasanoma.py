from __future__ import annotations
"""
Voxa Backend — Kasanoma Twi TTS Model Setup Script
Downloads/caches Kasanoma Twi TTS model weights locally in `models/kasanoma/`.

Target Model: `neriqlabs/kasanoma-tts-twi-v0.4` / `michsethowusu/kasanoma`
"""
import os
import shutil
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
TARGET_DIR = BASE_DIR / "models" / "kasanoma"
TARGET_MODEL_ONNX = TARGET_DIR / "kasanoma-twi.onnx"
TARGET_MODEL_JSON = TARGET_DIR / "kasanoma-twi.onnx.json"

EXISTING_COPY_DIR = BASE_DIR / "kasanoma_model-twi copy"


def setup_kasanoma_model() -> bool:
    """
    Ensures Kasanoma model files exist at models/kasanoma/kasanoma-twi.onnx
    and models/kasanoma/kasanoma-twi.onnx.json.
    """
    print("=" * 60)
    print("📦 SETTING UP KASANOMA TWI TTS MODEL")
    print("=" * 60)

    TARGET_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Check if model already exists in target folder
    if TARGET_MODEL_ONNX.exists() and TARGET_MODEL_JSON.exists():
        print(f"✅ Kasanoma model verified at: {TARGET_DIR}")
        print(f"   - ONNX: {TARGET_MODEL_ONNX.name} ({TARGET_MODEL_ONNX.stat().st_size / (1024*1024):.1f} MB)")
        print(f"   - JSON: {TARGET_MODEL_JSON.name}")
        return True

    # 2. Check if user provided model files in root copy folder
    if EXISTING_COPY_DIR.exists():
        src_onnx = EXISTING_COPY_DIR / "model.onnx"
        src_json = EXISTING_COPY_DIR / "model.onnx.json"

        if src_onnx.exists() and src_json.exists():
            print(f"⚡ Copying local Kasanoma model weights from '{EXISTING_COPY_DIR.name}' to '{TARGET_DIR.relative_to(BASE_DIR)}'...")
            shutil.copy2(src_onnx, TARGET_MODEL_ONNX)
            shutil.copy2(src_json, TARGET_MODEL_JSON)
            print("✅ Kasanoma model files installed successfully!")
            return True

    # 3. Download from Hugging Face if missing
    print("🌐 Downloading Kasanoma Twi TTS model weights from Hugging Face (neriqlabs/kasanoma-tts-twi-v0.4)...")
    try:
        from huggingface_hub import hf_hub_download  # type: ignore

        repo_id = "neriqlabs/kasanoma-tts-twi-v0.4"
        onnx_file = hf_hub_download(repo_id=repo_id, filename="model.onnx", local_dir=TARGET_DIR)
        json_file = hf_hub_download(repo_id=repo_id, filename="model.onnx.json", local_dir=TARGET_DIR)

        shutil.move(onnx_file, TARGET_MODEL_ONNX)
        shutil.move(json_file, TARGET_MODEL_JSON)

        print("✅ Download completed successfully!")
        return True
    except Exception as e:
        print(f"⚠️ Automatic Hugging Face download note: {e}")
        print("📁 Place your Kasanoma `.onnx` and `.json` model files in `models/kasanoma/`.")
        return False


if __name__ == "__main__":
    setup_kasanoma_model()
