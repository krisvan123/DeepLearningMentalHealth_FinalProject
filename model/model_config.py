"""Read the configuration belonging to the active Transformer checkpoint."""
import json
from pathlib import Path
from config.config import CLASS_LABELS, CONFIDENCE_THRESHOLD, MAX_SEQUENCE_LENGTH, MODEL_PATH


class ModelConfig:
    def __init__(self, model_path=MODEL_PATH):
        self.architecture = "BERT Transformer"
        self.framework = "PyTorch / Hugging Face Transformers"
        self.task = "Multi-class Text Classification"
        self.class_labels = list(CLASS_LABELS)
        self.max_sequence_length = MAX_SEQUENCE_LENGTH
        self.confidence_threshold = CONFIDENCE_THRESHOLD
        self.language = "en"
        path = Path(model_path) / "config.json"
        if path.is_file():
            metadata = json.loads(path.read_text())
            labels = metadata.get("id2label", {})
            actual = [labels.get(str(i)) for i in range(len(labels))]
            if actual != CLASS_LABELS:
                raise ValueError("Checkpoint label order does not match the dataset")
            self.max_sequence_length = int(metadata["mindcare_max_length"])
            self.confidence_threshold = float(metadata["mindcare_threshold"])
            self.language = metadata["mindcare_language"]

    @property
    def num_classes(self):
        return len(self.class_labels)

    def to_dict(self):
        return {"architecture": self.architecture, "framework": self.framework, "task": self.task,
                "class_labels": self.class_labels, "num_classes": self.num_classes,
                "max_sequence_length": self.max_sequence_length, "confidence_threshold": self.confidence_threshold,
                "language": self.language}
