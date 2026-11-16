"""MindCare Transformer configuration. Labels retain the source dataset names."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = BASE_DIR / "models"
MODEL_PATH = Path(os.getenv("MINDCARE_MODEL_PATH", str(MODELS_DIR / "transformer")))
TOKENIZER_PATH = MODEL_PATH
MODEL_METADATA_PATH = MODEL_PATH / "training_report.json"
RESPONSE_DIR = BASE_DIR / "respon"
ASSETS_DIR = BASE_DIR / "assets"
STYLESHEET_PATH = ASSETS_DIR / "styles.css"
APP_NAME = "MINDCARE"
APP_SUBTITLE = "Mental Health Reflection — Transformer Research Prototype"
APP_DESCRIPTION = "Research text classification with a fine-tuned BERT Transformer and controlled conversation responses."
SYSTEM_VERSION = "2.0.0"
CLASS_LABELS = ["Anxiety", "Depression", "Normal", "Suicidal"]
MAX_SEQUENCE_LENGTH = 128
# A provisional abstention threshold, not calibrated confidence or OOD detection.
CONFIDENCE_THRESHOLD = 0.55
RESPONSE_MAP = {
    "Anxiety": "anxiety.txt", "Depression": "depression.txt", "Normal": "neutral.txt",
    "Suicidal": "suicide.txt", "Neutral": "neutral.txt", "Suicide": "suicide.txt",
    "Greeting": "greeting.txt", "OOD": "ood.txt",
    "Eating Disorder": "eating_disorder.txt", "Addiction": "addiction.txt",
}
HIGH_RISK_CLASSES = ["Suicide", "Suicidal"]
QUICK_PROMPTS = ["I'm feeling anxious", "I feel overwhelmed", "I want to talk about something", "I'm having a difficult day"]
