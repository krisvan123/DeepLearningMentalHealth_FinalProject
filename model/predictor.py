"""Native Transformer logits to text-class scores. No recurrent-model fallback."""
import time
import torch
from model.model_config import ModelConfig


class ModelNotReadyError(RuntimeError):
    pass


class Predictor:
    def __init__(self, model=None, tokenizer=None, config=None):
        self.model, self.tokenizer = model, tokenizer
        self.config = config or ModelConfig()

    @property
    def is_ready(self):
        return self.model is not None and self.tokenizer is not None and self.tokenizer.is_ready

    def predict(self, raw_text):
        if not self.is_ready:
            raise ModelNotReadyError("Trained Transformer or tokenizer is unavailable")
        if not isinstance(raw_text, str) or not raw_text.strip():
            raise ValueError("Message must not be blank")
        if len(raw_text) > 4000:
            raise ValueError("Message must be at most 4000 characters")
        started = time.perf_counter()
        inputs = self.tokenizer.prepare_input(raw_text)
        with torch.inference_mode():
            logits = self.model(**inputs).logits
            if logits.shape != (1, self.config.num_classes) or not torch.isfinite(logits).all():
                raise ValueError("Invalid Transformer output dimensions or non-finite logits")
            probabilities = logits.softmax(dim=-1)[0].cpu().tolist()
        winner = max(range(len(probabilities)), key=probabilities.__getitem__)
        return {"predicted_class": self.config.class_labels[winner],
                "confidence": probabilities[winner],
                "below_threshold": probabilities[winner] < self.config.confidence_threshold,
                "is_ood": False,  # Low scores alone cannot establish out-of-distribution input.
                "probabilities": dict(zip(self.config.class_labels, probabilities)),
                "latency_ms": (time.perf_counter() - started) * 1000,
                "token_count": int(inputs["input_ids"].shape[-1])}
