"""Fast quality regressions that do not require TensorFlow model weights."""
import unittest
import numpy as np

from config.config import CLASS_LABELS
from model.model_config import ModelConfig
from model.predictor import Predictor
from response.response_manager import ResponseManager
from utils.intent_router import infer_simple_indonesian_theme
from utils.safety import needs_crisis_support


class FakeTokenizer:
    is_ready = True

    def prepare_input(self, text):
        return np.zeros((1, 100), dtype=np.int32)


class FakeModel:
    def __init__(self, scores):
        self.scores = np.array([scores], dtype=np.float32)

    def predict(self, data, verbose=0):
        return self.scores

    def __call__(self, data, training=False):
        return self.scores


class TestInferenceQuality(unittest.TestCase):
    def get_predictor(self, scores):
        return Predictor(
            model=FakeModel(scores), tokenizer=FakeTokenizer(),
            config=ModelConfig(),
        )

    def test_native_ood_sets_ood_flag(self):
        scores = [0.04] * len(CLASS_LABELS)
        scores[CLASS_LABELS.index("OOD")] = 0.72
        result = self.get_predictor(scores).predict("corporate quarterly earnings")
        self.assertEqual(result["predicted_class"], "OOD")
        self.assertTrue(result["is_ood"])

    def test_low_probability_uses_ood_fallback(self):
        scores = [0.15, 0.14, 0.13, 0.12, 0.11, 0.10, 0.09, 0.16]
        result = self.get_predictor(scores).predict("uncertain phrase")
        self.assertEqual(result["predicted_class"], "OOD")
        self.assertTrue(result["is_ood"])

    def test_mismatched_output_dimension_raises(self):
        with self.assertRaises(ValueError):
            self.get_predictor([0.5, 0.5]).predict("test")

    def test_nonfinite_output_raises(self):
        with self.assertRaises(ValueError):
            self.get_predictor([float("nan")] * 8).predict("test")


class TestResponseQuality(unittest.TestCase):
    def test_indonesian_response_with_topic(self):
        resp = ResponseManager().get_response(
            "Anxiety", user_message="Aku takut menghadapi ujian besok"
        )
        self.assertIn("kuliah atau sekolah", resp["text"].lower())
        self.assertIn("khawatir", resp["text"].lower())

    def test_english_topic_and_followup(self):
        resp = ResponseManager().get_response(
            "Neutral", user_message="I feel overwhelmed",
            previous_user_message="I have many college assignments",
        )
        self.assertIn("studies", resp["text"].lower())

    def test_unknown_class_falls_back(self):
        resp = ResponseManager().get_response("unknown", user_message="x")
        self.assertIn("understood", resp["text"].lower())

    def test_safety_response_has_no_casual_topic_prompt(self):
        resp = ResponseManager().get_response(
            "Suicide", user_message="Aku sedang sangat kesulitan dengan tugas kuliah"
        )
        self.assertTrue(resp["is_high_risk"])
        self.assertNotIn("kuliah atau sekolah", resp["text"].lower())


class TestRouting(unittest.TestCase):
    def test_indonesian_greeting(self):
        self.assertEqual(infer_simple_indonesian_theme("Halo!"), "Greeting")

    def test_indonesian_anxiety_theme(self):
        self.assertEqual(infer_simple_indonesian_theme("Aku cemas karena ujian"), "Anxiety")

    def test_do_not_assume_unrelated_theme(self):
        self.assertIsNone(infer_simple_indonesian_theme("The weather looks nice."))

    def test_independent_safety_guard(self):
        self.assertTrue(needs_crisis_support("I want to end my life"))
        self.assertTrue(needs_crisis_support("Aku ingin mengakhiri hidup"))
        self.assertFalse(needs_crisis_support("I want to end this project"))

    def test_endpoint_uses_conversation_context(self):
        from backend import server

        class Stub:
            is_ready = True
            seen = None

            def predict(self, text):
                self.seen = text
                return {
                    "predicted_class": "Anxiety", "confidence": 0.8,
                    "is_ood": False, "latency_ms": 1.0,
                    "probabilities": {"Anxiety": 0.8},
                }

        original = server._predictor
        stub = Stub()
        server._predictor = stub
        try:
            result = server.chat_endpoint(server.ChatRequest(
                message="because I failed before",
                history=[{"role": "user", "content": "I worry about my college exam"}],
            ))
            self.assertIn("college exam", stub.seen)
            self.assertEqual(result.predicted_class, "Anxiety")
            self.assertIn("studies", result.response.lower())
        finally:
            server._predictor = original


if __name__ == "__main__":
    unittest.main()
