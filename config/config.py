"""Configuration module for MindCare Deep Learning Mental Health Chatbot.

Defines application constants, file paths, class mappings, threshold settings,
and theme styling colors.
"""

from pathlib import Path
from typing import Dict, List

# Base project paths
BASE_DIR: Path = Path(__file__).resolve().parent.parent
CONFIG_DIR: Path = BASE_DIR / "config"
MODELS_DIR: Path = BASE_DIR / "models"
RESPONSE_DIR: Path = BASE_DIR / "respon"
ASSETS_DIR: Path = BASE_DIR / "assets"
DATASET_CHAT_DIR: Path = BASE_DIR / "dataset_chat"
DAILY_CHAT_DIR: Path = BASE_DIR / "daily_chat"
WRONG_CONTEXT_DIR: Path = BASE_DIR / "worng_context"

# Model & Tokenizer artifacts
MODEL_PATH: Path = MODELS_DIR / "model_final.h5"
TOKENIZER_PATH: Path = MODELS_DIR / "tokenizer.pickle"
MODEL_METADATA_PATH: Path = MODELS_DIR / "model_metadata.json"
STYLESHEET_PATH: Path = ASSETS_DIR / "styles.css"

# Application branding & text
APP_NAME: str = "MINDCARE"
APP_SUBTITLE: str = "Mental Health Support Assistant"
APP_DESCRIPTION: str = (
    "An academic Deep Learning text classification prototype designed to explore "
    "the context of user reflections and provide controlled, empathetic responses."
)
SYSTEM_VERSION: str = "1.0.0"

# Target classification classes (8 categories)
# 5 Mental-health classes + 3 Supporting classes
CLASS_LABELS: List[str] = [
    "Addiction",
    "Anxiety",
    "Depression",
    "Eating Disorder",
    "Suicide",
    "Neutral",
    "OOD",
    "Greeting",
]

# Response file mapping per class (stored in respon/)
RESPONSE_MAP: Dict[str, str] = {
    "Addiction": "addiction.txt",
    "Anxiety": "anxiety.txt",
    "Depression": "depression.txt",
    "Eating Disorder": "eating_disorder.txt",
    "Suicide": "suicide.txt",
    "Neutral": "neutral.txt",
    "Greeting": "greeting.txt",
    "OOD": "ood.txt",
}

# High-risk classes requiring crisis protocols and visual distinction
HIGH_RISK_CLASSES: List[str] = ["Suicide"]

# Model hyperparameters and sequence settings
MAX_SEQUENCE_LENGTH: int = 100
MAX_VOCAB_SIZE: int = 15000
EMBEDDING_DIM: int = 64
LSTM_UNITS: int = 64

# Out-of-Distribution (OOD) confidence threshold
# For 8 classes (random baseline = 12.5%), scores below 0.35 indicate ambiguous/OOD input
CONFIDENCE_THRESHOLD: float = 0.35

# Suggestion quick prompts for landing state
QUICK_PROMPTS: List[str] = [
    "I'm feeling anxious",
    "I feel overwhelmed",
    "I want to talk about something",
    "I'm having a difficult day",
]

# Monochrome Design System Color Tokens
COLORS: Dict[str, str] = {
    "black": "#000000",
    "white": "#FFFFFF",
    "gray_50": "#F9F9F9",
    "gray_100": "#F5F5F5",
    "gray_200": "#EAEAEA",
    "gray_300": "#D9D9D9",
    "gray_600": "#666666",
    "gray_800": "#333333",
    "gray_900": "#111111",
}
