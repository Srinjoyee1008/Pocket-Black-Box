"""Optional local Whisper transcription. Model files must be packaged before use."""

from dataclasses import dataclass
import importlib.util
import logging
import os
from pathlib import Path
import tempfile
from typing import Protocol

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class TranscriptionResult:
    transcript: str | None
    model_status: str
    available: bool


class Transcriber(Protocol):
    def transcribe(self, audio: bytes, content_type: str) -> TranscriptionResult: ...


class PackagedWhisperTranscriber:
    """Runs faster-whisper only with an explicitly installed local model directory.

    Neither the runtime nor model weights are fetched at runtime. Audio is held in a temporary
    file only while the local inference engine reads it, then removed.
    """

    def __init__(self, model_dir: Path | None = None) -> None:
        configured_path = os.environ.get("PBB_WHISPER_MODEL_PATH")
        self.model_dir = model_dir or (
            Path(configured_path) if configured_path else Path(__file__).parent / "models" / "whisper-small"
        )
        self._model = None

    def _has_model_assets(self) -> bool:
        return (self.model_dir / "config.json").is_file() and (self.model_dir / "model.bin").is_file()

    @property
    def available(self) -> bool:
        return (
            self._has_model_assets()
            and importlib.util.find_spec("faster_whisper") is not None
        )

    def transcribe(self, audio: bytes, content_type: str) -> TranscriptionResult:
        if not audio:
            return TranscriptionResult(None, "audio_empty", False)
        if not self.model_dir.is_dir():
            return TranscriptionResult(None, "model_not_packaged", False)
        if not self._has_model_assets():
            return TranscriptionResult(None, "model_files_incomplete", False)
        if importlib.util.find_spec("faster_whisper") is None:
            return TranscriptionResult(None, "faster_whisper_not_installed", False)

        temporary_path: Path | None = None
        try:
            if self._model is None:
                from faster_whisper import WhisperModel

                self._model = WhisperModel(str(self.model_dir.resolve()), device="cpu", compute_type="int8")
            suffix = {
                "audio/wav": ".wav",
                "audio/mpeg": ".mp3",
                "audio/mp4": ".m4a",
                "audio/x-m4a": ".m4a",
                "audio/webm": ".webm",
            }.get(content_type, ".audio")
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as audio_file:
                temporary_path = Path(audio_file.name)
                audio_file.write(audio)
            segments, _info = self._model.transcribe(str(temporary_path), beam_size=1, vad_filter=True)
            transcript = " ".join(segment.text.strip() for segment in segments).strip()
            if not transcript:
                return TranscriptionResult(None, "no_speech_detected", False)
            return TranscriptionResult(transcript, "faster_whisper_small_local", True)
        except Exception:
            self._model = None
            logger.exception("Local Whisper transcription failed.")
            return TranscriptionResult(None, "local_model_error", False)
        finally:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)
