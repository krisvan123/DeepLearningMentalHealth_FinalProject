"""Model configuration and metadata definition for MindCare."""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from config.config import (
    CLASS_LABELS,
    CONFIDENCE_THRESHOLD,
    EMBEDDING_DIM,
    LSTM_UNITS,
    MAX_SEQUENCE_LENGTH,
    MAX_VOCAB_SIZE,
    MODEL_METADATA_PATH,
)


class ModelConfig:
    """Encapsulates model architecture parameters and classification classes."""

    def __init__(
        self,
        architecture: str = "Bi-LSTM (Bidirectional Long Short-Term Memory)",
        task: str = "Multi-class Text Classification",
        class_labels: Optional[List[str]] = None,
        max_sequence_length: int = MAX_SEQUENCE_LENGTH,
        max_vocab_size: int = MAX_VOCAB_SIZE,
        embedding_dim: int = EMBEDDING_DIM,
        lstm_units: int = LSTM_UNITS,
        confidence_threshold: float = CONFIDENCE_THRESHOLD,
        framework: str = "TensorFlow / Keras",
        metadata_file: Path = MODEL_METADATA_PATH,
    ):
        self.architecture = architecture
        self.task = task
        self.class_labels = list(class_labels or CLASS_LABELS)
        self.max_sequence_length = max_sequence_length
        self.max_vocab_size = max_vocab_size
        self.embedding_dim = embedding_dim
        self.lstm_units = lstm_units
        self.confidence_threshold = confidence_threshold
        self.framework = framework
        self.metadata_file = Path(metadata_file)

        # Attempt to read updated metadata if generated during training
        self._load_from_metadata_file()

    def _load_from_metadata_file(self) -> None:
        """Load metadata file if present on disk."""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                self.architecture = meta.get("architecture", self.architecture)
                self.task = meta.get("task", self.task)
                if "class_labels" in meta:
                    self.class_labels = meta["class_labels"]
                self.max_sequence_length = meta.get(
                    "max_sequence_length", self.max_sequence_length
                )
                self.framework = meta.get("framework", self.framework)
                self.confidence_threshold = meta.get(
                    "confidence_threshold", self.confidence_threshold
                )
            except Exception:
                pass

    @property
    def num_classes(self) -> int:
        return len(self.class_labels)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "architecture": self.architecture,
            "task": self.task,
            "framework": self.framework,
            "num_classes": self.num_classes,
            "class_labels": self.class_labels,
            "max_sequence_length": self.max_sequence_length,
            "max_vocab_size": self.max_vocab_size,
            "embedding_dim": self.embedding_dim,
            "lstm_units": self.lstm_units,
            "confidence_threshold": self.confidence_threshold,
        }
