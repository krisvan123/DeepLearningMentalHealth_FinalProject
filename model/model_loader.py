"""Load local safetensors only; no network or untrained-model fallback at runtime."""
from functools import lru_cache
from pathlib import Path
from config.config import MODEL_PATH, TOKENIZER_PATH
from model.model_config import ModelConfig
from preprocessing.tokenizer import TokenizerWrapper


@lru_cache(maxsize=4)
def load_model(model_path=MODEL_PATH):
    path = Path(model_path)
    if not (path / "model.safetensors").is_file():
        return None, "Trained Transformer checkpoint is missing. Run scripts.train_transformer first."
    try:
        import torch
        from transformers import AutoModelForSequenceClassification
        torch.set_num_threads(2)
        config = ModelConfig(path)
        model = AutoModelForSequenceClassification.from_pretrained(path, local_files_only=True, use_safetensors=True, trust_remote_code=False)
        if [model.config.id2label[i] for i in range(model.config.num_labels)] != config.class_labels:
            raise ValueError("Model output labels differ from configured labels")
        model.eval()
        return model, None
    except Exception as exc:
        return None, f"Transformer could not load: {exc}"


@lru_cache(maxsize=4)
def load_tokenizer(tokenizer_path=TOKENIZER_PATH):
    try:
        return TokenizerWrapper.load_from_file(tokenizer_path), None
    except Exception as exc:
        return None, f"Tokenizer could not load: {exc}"
