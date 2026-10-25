"""Predictor module for MindCare chatbot.

Coordinates text preprocessing, tokenization, model inference, softmax probability
computation, and out-of-distribution (OOD) detection.
"""

import time
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from config.config import CLASS_LABELS, CONFIDENCE_THRESHOLD
from model.model_config import ModelConfig
from preprocessing.text_preprocessor import TextPreprocessor
from preprocessing.tokenizer import TokenizerWrapper
from utils.logging_utils import get_logger

logger = get_logger(__name__)


class ModelNotReadyError(Exception):
    """Raised when inference is attempted without a loaded model or tokenizer."""
    pass


class Predictor:
    """Handles end-to-end inference from raw text to class probabilities."""

    def __init__(
        self,
        model: Optional[Any] = None,
        tokenizer: Optional[TokenizerWrapper] = None,
        config: Optional[ModelConfig] = None,
    ):
        self.model = model
        self.tokenizer = tokenizer
        self.config = config or ModelConfig()
        self.preprocessor = TextPreprocessor()

    @property
    def is_ready(self) -> bool:
        """Check if model and tokenizer are loaded and ready."""
        return self.model is not None and self.tokenizer is not None and self.tokenizer.is_ready

    def predict(self, raw_text: str) -> Dict[str, Any]:
        """Run text classification on raw text input.

        Args:
            raw_text: Raw string input from user.

        Returns:
            Dictionary with prediction results, probabilities, confidence, and latency.
        """
        if not self.is_ready:
            raise ModelNotReadyError(
                "Model or tokenizer is not loaded. Cannot run inference."
            )

        start_time = time.perf_counter()

        # 1. Preprocess text
        preprocessed = self.preprocessor.clean_text(raw_text)

        # 2. Tokenize and prepare input tensor
        input_tensor = self.tokenizer.prepare_input(preprocessed)
        tokens = preprocessed.split()
        token_count = len(tokens)

        # 3. Model Inference
        probs = self._run_inference(input_tensor)

        # Measure elapsed latency
        latency_ms = (time.perf_counter() - start_time) * 1000.0

        # 4. Determine class and probabilities
        labels = self.config.class_labels
        num_labels = len(labels)

        # Ensure probabilities match number of labels
        if len(probs) != num_labels:
            logger.warning(
                "Mismatch between model output shape (%d) and class labels (%d)",
                len(probs),
                num_labels,
            )
            raise ValueError("Model output dimension does not match class-label mapping.")
        if not np.all(np.isfinite(probs)):
            raise ValueError("Model produced non-finite probabilities.")

        max_idx = int(np.argmax(probs))
        raw_class = labels[max_idx]
        confidence = float(probs[max_idx])

        # 5. OOD Check (Out of Distribution)
        # If confidence is lower than threshold and OOD class exists in labels
        is_ood = raw_class == "OOD"
        threshold = self.config.confidence_threshold
        if confidence < threshold and "OOD" in labels:
            predicted_class = "OOD"
            is_ood = True
        else:
            predicted_class = raw_class

        prob_dict = {
            labels[i]: round(float(probs[i]), 4) for i in range(len(labels))
        }

        return {
            "predicted_class": predicted_class,
            "raw_class": raw_class,
            "confidence": round(confidence, 4),
            "is_ood": is_ood,
            "threshold": threshold,
            "probabilities": prob_dict,
            "latency_ms": round(latency_ms, 2),
            "preprocessed_text": preprocessed,
            "token_count": token_count,
            "status": "success",
        }

    def _run_inference(self, input_tensor: np.ndarray) -> np.ndarray:
        """Execute forward pass through model (TensorFlow or PyTorch)."""
        # TensorFlow / Keras model
        if hasattr(self.model, "predict"):
            try:
                preds = self.model(input_tensor, training=False)
                if hasattr(preds, "numpy"):
                    probs = preds.numpy()[0]
                else:
                    probs = np.array(preds)[0]
                return probs
            except Exception:
                preds = self.model.predict(input_tensor, verbose=0)
                return np.array(preds)[0]

        # PyTorch model
        try:
            import torch
            with torch.no_grad():
                tensor_torch = torch.from_numpy(input_tensor).long()
                output = self.model(tensor_torch)
                probs = torch.softmax(output, dim=-1).cpu().numpy()[0]
                return probs
        except Exception as exc:
            logger.error("Inference execution failed: %s", exc)
            raise
