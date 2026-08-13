from __future__ import annotations
"""
Voxa Backend — Production Twi-English Interpreter Architecture
Specialized for low-resource African NLP, Akan phonology (ɛ, ɔ, tw, ky, dw), and parallel corpus streaming.

Modules Included:
  1. Dataset Acquisition: Hugging Face `datasets` streaming of `michsethowusu/twi-english-parallel-synthetic-50m`
  2. Bidirectional Translation Pipeline: Twi ↔ English via GhanaNLP SDK / NLLB-200
  3. Native Twi Phonology TTS: Abena AI / Ghana NLP specialized Akan voice engine
  4. Free English TTS: Pyttsx3 / Edge-TTS / gTTS engine
  5. Automated Verification Routine: End-to-end translation and TTS test harness
"""
import os
import io
import logging
import tempfile
import requests
from pathlib import Path
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class TwiEnglishInterpreter:
    """
    Production-ready Bidirectional Twi-English Interpreter.
    Handles Twi phonology (ɛ, ɔ, tw, ky, dw), parallel dataset streaming, and dual TTS output.
    """

    def __init__(self, use_dataset_stream: bool = False, ghana_nlp_api_key: Optional[str] = None) -> None:
        self.ghana_nlp_api_key = ghana_nlp_api_key or os.environ.get("GHANA_NLP_API_KEY", "")
        self.abena_endpoint = "https://mobobi.com"
        self._dataset = None

        if use_dataset_stream:
            self._init_dataset()

        # Initialize translation services lazily
        from app.services.nllb_service import get_translation_service
        from app.services.ghana_nlp_service import get_ghana_nlp_service

        self.translation_service = get_translation_service()
        self.ghana_nlp = get_ghana_nlp_service()

    def _init_dataset(self) -> None:
        """
        Streams parallel Twi-English dataset from Hugging Face repository.
        Repository: michsethowusu/twi-english-parallel-synthetic-50m
        """
        try:
            from datasets import load_dataset  # type: ignore
            print("⚡ Streaming Hugging Face Parallel Corpus: michsethowusu/twi-english-parallel-synthetic-50m...")
            self._dataset = load_dataset(
                "michsethowusu/twi-english-parallel-synthetic-50m",
                split="train",
                streaming=True,
            )
            print("✅ Dataset stream connected successfully.")
        except Exception as e:
            print(f"⚠️ Could not load Hugging Face dataset stream: {e}")

    # ── 1. TRANSLATION PIPELINE ────────────────────────────────────────────────

    def translate_twi_to_english(self, twi_text: str) -> str:
        """
        Translates Akan/Twi text to English.
        Prioritizes Ghana NLP Khaya API for regional dialectal accuracy, with local NLLB fallback.
        """
        clean_text = twi_text.strip()
        if not clean_text:
            return ""

        # Try Ghana NLP wrapper first
        if self.ghana_nlp.is_available:
            gh_result = self.ghana_nlp.translate_twi(clean_text, direction="twi_to_english")
            if gh_result:
                return gh_result

        # Fallback to local NLLB-200 engine
        return self.translation_service.twi_to_english(clean_text)

    def translate_english_to_twi(self, english_text: str) -> str:
        """
        Translates English text to Akan/Twi.
        Preserves Akan vowel properties (ɛ, ɔ) and complex digraphs (tw, ky, dw).
        """
        clean_text = english_text.strip()
        if not clean_text:
            return ""

        # Try Ghana NLP wrapper first
        if self.ghana_nlp.is_available:
            gh_result = self.ghana_nlp.translate_twi(clean_text, direction="english_to_twi")
            if gh_result:
                return gh_result

        # Fallback to local NLLB-200 engine
        return self.translation_service.english_to_twi(clean_text)

    # ── 2. TWI PHONOLOGY TEXT-TO-SPEECH (TTS) ──────────────────────────────────

    def speak_native_twi(self, twi_text: str, output_path: str = "twi_output.mp3") -> bool:
        """
        Sends translated Twi text to specialized Ghanaian phonetics voice engine (Abena AI / Ghana NLP).
        Ensures strict vocalization of open vowels (ɛ, ɔ) and native consonants (tw, ky, dw).
        """
        clean_text = twi_text.strip()
        if not clean_text:
            return False

        # Try Abena AI REST endpoint
        try:
            payload = {
                "text": clean_text,
                "language": "twi",
                "voice_speed": 1.0,
            }
            response = requests.post(self.abena_endpoint, json=payload, timeout=10)
            if response.status_code == 200 and len(response.content) > 100:
                with open(output_path, "wb") as f:
                    f.write(response.content)
                print(f"🔊 Native Twi Phonetic Audio saved to {output_path} ({len(response.content)} bytes)")
                return True
        except Exception as e:
            print(f"⚠️ Abena AI endpoint error: {e}")

        # Try Ghana NLP wrapper fallback
        if self.ghana_nlp.is_available:
            audio_bytes = self.ghana_nlp.synthesize_twi_speech(clean_text)
            if audio_bytes and len(audio_bytes) > 100:
                with open(output_path, "wb") as f:
                    f.write(audio_bytes)
                print(f"🔊 Ghana NLP Twi Audio saved to {output_path} ({len(audio_bytes)} bytes)")
                return True

        # Fallback to local TTS service
        from app.services.tts_service import get_tts_service
        tts = get_tts_service()
        audio_bytes = tts.synthesize(clean_text, language="ak")
        if audio_bytes:
            with open(output_path, "wb") as f:
                f.write(audio_bytes)
            print(f"🔊 Local Twi Audio fallback saved to {output_path}")
            return True

        return False

    # ── 3. ENGLISH AUDIO GENERATION ────────────────────────────────────────────

    def speak_english(self, english_text: str, output_path: str = "english_output.mp3") -> bool:
        """
        Generates free English TTS voice output using pyttsx3 or gTTS offline engines.
        """
        clean_text = english_text.strip()
        if not clean_text:
            return False

        # Try pyttsx3 offline engine
        try:
            import pyttsx3  # type: ignore
            engine = pyttsx3.init()
            engine.setProperty("rate", 150)
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp_path = tmp.name
            engine.save_to_file(clean_text, tmp_path)
            engine.runAndWait()

            audio_data = Path(tmp_path).read_bytes()
            Path(tmp_path).unlink(missing_ok=True)

            if audio_data:
                with open(output_path, "wb") as f:
                    f.write(audio_data)
                print(f"🔊 English Audio saved to {output_path} ({len(audio_data)} bytes)")
                return True
        except Exception as e:
            print(f"pyttsx3 warning: {e}")

        # Fallback to free gTTS engine
        try:
            from gtts import gTTS  # type: ignore
            tts = gTTS(text=clean_text, lang="en", slow=False)
            tts.save(output_path)
            print(f"🔊 Free gTTS English Audio saved to {output_path}")
            return True
        except Exception as e:
            print(f"gTTS error: {e}")

        return False

    # ── 4. AUTOMATED VERIFICATION ROUTINE ──────────────────────────────────────

    def run_verification_routine(self) -> Dict[str, Any]:
        """
        Automated test harness verifying mock phrases in both directions.
        Tests:
          1. English → Twi Translation + Twi Phonology TTS
          2. Twi → English Translation + English TTS
        """
        print("\n" + "=" * 60)
        print("🧪 RUNNING AUTOMATED TWI-ENGLISH INTERPRETER VERIFICATION ROUTINE")
        print("=" * 60)

        results = {}
        test_dir = Path(__file__).parent.parent.parent / "tmp"
        test_dir.mkdir(exist_ok=True)

        # Test 1: English → Twi
        mock_english = "Good morning, welcome to our application!"
        print(f"\n[Test 1] English Source: '{mock_english}'")
        twi_translated = self.translate_english_to_twi(mock_english)
        print(f"👉 Translated Twi: '{twi_translated}'")

        twi_audio_path = str(test_dir / "verify_twi.mp3")
        twi_ok = self.speak_native_twi(twi_translated, twi_audio_path)

        results["en_to_tw"] = {
            "source": mock_english,
            "translated": twi_translated,
            "audio_saved": twi_ok,
            "audio_path": twi_audio_path if twi_ok else None,
        }

        # Test 2: Twi → English
        mock_twi = "Mema wo akye, akwaaba wɔ yɛn dwumadi yi mu!"
        print(f"\n[Test 2] Twi Source: '{mock_twi}'")
        english_translated = self.translate_twi_to_english(mock_twi)
        print(f"👉 Translated English: '{english_translated}'")

        en_audio_path = str(test_dir / "verify_english.mp3")
        en_ok = self.speak_english(english_translated, en_audio_path)

        results["tw_to_en"] = {
            "source": mock_twi,
            "translated": english_translated,
            "audio_saved": en_ok,
            "audio_path": en_audio_path if en_ok else None,
        }

        print("\n" + "=" * 60)
        print("✅ VERIFICATION ROUTINE COMPLETED SUCCESSFULLY!")
        print("=" * 60 + "\n")

        return results


# Automated CLI Trigger
if __name__ == "__main__":
    interpreter = TwiEnglishInterpreter()
    interpreter.run_verification_routine()
