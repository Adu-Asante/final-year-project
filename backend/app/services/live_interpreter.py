from __future__ import annotations
"""
Voxa Backend — Live Audio Interpreter Service (100% Offline Kasanoma Pipeline)
Real-time, multi-threaded live microphone capturing system with VAD Absolute Timeout Guard,
local Whisper STT, local NLLB-200 / Ghana NLP translation, and offline Kasanoma Piper ONNX Twi speech engine.

Features:
  1. Audio Ingestion: `sounddevice` InputStream capturing 16,000Hz mono floating-point PCM audio into a thread-safe Queue.
  2. VAD Absolute Timeout Guard: RMS calculation with `max_buffer_blocks = 20` (10s max speech buffer cap) preventing buffer leaks.
  3. Offline Kasanoma Neural Voice: Stripped third-party network APIs; uses local Kasanoma ONNX model for near-zero latency Twi vocal feedback.
  4. Non-Blocking Async Playback: Plays generated Twi/English audio instantly using native subprocesses (`afplay` on macOS) without locking audio threads.
"""
import os
import sys
import time
import queue
import logging
import threading
import tempfile
import subprocess
import numpy as np
from pathlib import Path
from typing import Optional, Any

from app.services.kasanoma_engine import get_kasanoma_engine

logger = logging.getLogger(__name__)


def play_audio_async(filepath: str) -> None:
    """Fires native system audio playback without locking the Python process threads."""
    if not os.path.exists(filepath) or os.path.getsize(filepath) < 100:
        return

    try:
        if sys.platform == "darwin":  # macOS native player
            subprocess.Popen(["afplay", filepath], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        elif sys.platform.startswith("linux"):
            for cmd in ["mpg123", "paplay", "aplay", "mpv"]:
                try:
                    subprocess.Popen([cmd, filepath], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    break
                except FileNotFoundError:
                    continue
    except Exception as e:
        logger.warning("Could not trigger async audio playback: %s", e)


class LiveAudioInterpreter:
    """
    High-performance real-time live microphone interpreter with 100% offline Kasanoma engine.
    Captures live microphone stream, enforces VAD 10s absolute timeout guard,
    transcribes via local Whisper, translates bidirectionally, and plays natural Twi/English audio asynchronously.
    """

    def __init__(
        self,
        model_size: str = "tiny",
        sample_rate: int = 16000,
        block_duration: float = 0.5,
        silence_threshold: float = 0.02,
        silence_blocks_needed: int = 4,   # 4 * 0.5s = 2.0s continuous silence
        max_buffer_blocks: int = 20,       # 20 * 0.5s = 10s max continuous speech cap
    ) -> None:
        self.sample_rate = sample_rate
        self.block_duration = block_duration
        self.block_size = int(sample_rate * block_duration)
        self.silence_threshold = silence_threshold
        self.silence_blocks_needed = silence_blocks_needed
        self.max_buffer_blocks = max_buffer_blocks

        self.audio_queue: queue.Queue[np.ndarray] = queue.Queue()
        self.is_recording = False
        self.recording_thread: Optional[threading.Thread] = None

        print(f"🚀 Initializing local Whisper STT model ({model_size})...")
        import torch
        from transformers import pipeline

        device = "mps" if torch.backends.mps.is_available() else "cpu"
        self._pipe = pipeline(
            "automatic-speech-recognition",
            model=f"openai/whisper-{model_size}",
            device=device,
        )
        print("✅ Local Whisper STT model ready.")

        # Initialize translation & Kasanoma engine
        from app.services.twi_english_interpreter import TwiEnglishInterpreter
        self.interpreter = TwiEnglishInterpreter()
        self.kasanoma_engine = get_kasanoma_engine()

    def _audio_callback(self, indata: np.ndarray, frames: int, time_info: Any, status: Any) -> None:
        """Continuously pulls floating-point pulse-code data from soundcard stream."""
        if status:
            print(f"Soundcard Status: {status}", file=sys.stderr)
        self.audio_queue.put(indata.copy())

    def start_live_session(self) -> None:
        """Spins up background input recording thread processing loops."""
        self.is_recording = True
        with self.audio_queue.mutex:
            self.audio_queue.queue.clear()

        self.recording_thread = threading.Thread(target=self._record_loop, daemon=True)
        self.recording_thread.start()
        print("🎤 Live Microphone Active. Start speaking now... (Press Ctrl+C to stop)\n")

    def stop_live_session(self) -> None:
        """Stops live microphone capturing thread cleanly."""
        self.is_recording = False
        if self.recording_thread and self.recording_thread.is_alive():
            self.recording_thread.join(timeout=2.0)
        print("🛑 Live Microphone session terminated.")

    def trigger_phonetic_twi_voice(self, text_string: str, output_path: str = "live_twi_vocal.mp3") -> bool:
        """
        Streams text payloads to 100% offline local Kasanoma neural voice engine.
        Maps open vowels (ɛ, ɔ) and native consonants (tw, dw, ky) cleanly.
        """
        try:
            ok = self.kasanoma_engine.synthesize_twi(text_string, output_path=output_path)
            if ok:
                print(f"🔊 Playback Ready: Saved '{output_path}' via Offline Kasanoma Model")
                return True
        except Exception as e:
            print(f"Failed to compile voice feedback: {e}")

        # Fallback to interpreter service
        return self.interpreter.speak_native_twi(text_string, output_path)

    def _record_loop(self) -> None:
        """Processes rolling queue frames and chunks audio data into Whisper format."""
        try:
            import sounddevice as sd  # type: ignore
        except ImportError:
            print("⚠️ `sounddevice` package not installed or portaudio missing.")
            return

        try:
            with sd.InputStream(
                samplerate=self.sample_rate,
                channels=1,
                blocksize=self.block_size,
                callback=self._audio_callback,
            ):
                rolling_buffer = []
                silent_blocks = 0

                while self.is_recording:
                    try:
                        data_block = self.audio_queue.get(timeout=1.0)
                        rolling_buffer.append(data_block)

                        # Calculate Root-Mean-Square (RMS) amplitude for VAD
                        rms = float(np.sqrt(np.mean(data_block ** 2)))
                        if rms < self.silence_threshold:
                            silent_blocks += 1
                        else:
                            silent_blocks = 0  # Voice activity detected

                        reached_silence_boundary = silent_blocks >= self.silence_blocks_needed and len(rolling_buffer) > self.silence_blocks_needed
                        reached_max_timeout_cap = len(rolling_buffer) >= self.max_buffer_blocks

                        if reached_silence_boundary or reached_max_timeout_cap:
                            reason = "10s Absolute Timeout Cap" if reached_max_timeout_cap else "Sentence Boundary Silence"
                            print(f"\n⚡ [{reason}] Processing Audio Segment ({len(rolling_buffer)*self.block_duration:.1f}s)...")

                            end_idx = -self.silence_blocks_needed if reached_silence_boundary else len(rolling_buffer)
                            valid_blocks = rolling_buffer[:end_idx] if end_idx < 0 else rolling_buffer

                            if valid_blocks:
                                full_audio = np.concatenate(valid_blocks, axis=0).ravel()
                                if len(full_audio) >= self.sample_rate * 0.5:  # Min 0.5s audio
                                    threading.Thread(
                                        target=self.process_and_interpret,
                                        args=(full_audio,),
                                        daemon=True
                                    ).start()

                            rolling_buffer = []
                            silent_blocks = 0

                    except queue.Empty:
                        continue
        except Exception as e:
            print(f"⚠️ Error in microphone stream loop: {e}")

    def process_and_interpret(self, audio_array: np.ndarray) -> None:
        """
        Transcribes incoming audio array, performs bidirectional translation,
        and triggers offline Kasanoma phonetic Twi or English vocalization with async playback.
        """
        from scipy.io.wavfile import write  # type: ignore

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            temp_filename = tmp.name

        try:
            # Save floating point PCM data into 16kHz WAV format
            int_audio = (audio_array * 32767).clip(-32768, 32767).astype(np.int16)
            write(temp_filename, self.sample_rate, int_audio)

            # 1. Local Whisper STT Inference
            res = self._pipe(temp_filename, return_timestamps=True)
            detected_text = res.get("text", "").strip() if isinstance(res, dict) else str(res).strip()

            if not detected_text or len(detected_text) < 2:
                return  # Filter transient static pops

            # Detect language context (Twi vs English)
            detected_lang = "en"
            twi_keywords = ["me", "wo", "ye", "mema", "akwaaba", "dabi", "aane", "medaase", "nkwa", "daakye"]
            lower_text = detected_text.lower()
            if any(kw in lower_text for kw in twi_keywords) or any(c in lower_text for c in ["ɛ", "ɔ"]):
                detected_lang = "tw"

            print(f"✨ Transcribed [{detected_lang.upper()}]: {detected_text}")

            # 2. Routing & Offline Speech Synthesis
            out_dir = Path(__file__).parent.parent.parent / "tmp"
            out_dir.mkdir(exist_ok=True)

            if detected_lang == "en":
                # Translate English → Twi
                twi_translation = self.interpreter.translate_english_to_twi(detected_text)
                print(f"🔄 Translated Twi Text: {twi_translation}")

                output_audio_path = str(out_dir / "live_twi_vocal.mp3")
                ok = self.trigger_phonetic_twi_voice(twi_translation, output_audio_path)
                if ok:
                    print(f"🔊 Playback Fired (Async): '{output_audio_path}'")
                    play_audio_async(output_audio_path)

            else:
                # Translate Twi → English
                english_translation = self.interpreter.translate_twi_to_english(detected_text)
                print(f"🔄 Translated English Text: {english_translation}")

                output_audio_path = str(out_dir / "live_english_vocal.mp3")
                ok = self.interpreter.speak_english(english_translation, output_audio_path)
                if ok:
                    print(f"🔊 Playback Fired (Async): '{output_audio_path}'")
                    play_audio_async(output_audio_path)

        except Exception as e:
            print(f"⚠️ Error processing audio segment: {e}")
        finally:
            Path(temp_filename).unlink(missing_ok=True)


if __name__ == "__main__":
    interpreter = LiveAudioInterpreter(model_size="tiny")
    try:
        interpreter.start_live_session()
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping live audio stream pipelines safely.")
        interpreter.stop_live_session()
