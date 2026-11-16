"""Regression tests for native Transformer scores and conversation routing."""
import unittest
from types import SimpleNamespace
import torch
from fastapi.testclient import TestClient
from config.config import CLASS_LABELS
from model.model_config import ModelConfig
from model.predictor import Predictor, ModelNotReadyError
from response.response_manager import ResponseManager
from utils.intent_router import infer_simple_indonesian_theme
from utils.safety import needs_crisis_support


class FakeTokenizer:
    is_ready = True
    seen = None
    def prepare_input(self, text):
        self.seen = text
        return {"input_ids": torch.tensor([[2, 4, 3]]), "attention_mask": torch.ones(1, 3)}


class FakeModel:
    def __init__(self, scores):
        self.scores = scores
    def __call__(self, **inputs):
        return SimpleNamespace(logits=torch.tensor([self.scores]))


class InferenceTests(unittest.TestCase):
    def predictor(self, values):
        return Predictor(FakeModel(values), FakeTokenizer(), ModelConfig())
    def test_native_logits_softmax(self):
        result = self.predictor([4., 1., 0., -1.]).predict("A sample message")
        self.assertEqual(result["predicted_class"], "Anxiety")
        self.assertAlmostEqual(sum(result["probabilities"].values()), 1., places=6)
        self.assertFalse(result["is_ood"])
    def test_abstention_is_not_ood_detection(self):
        result = self.predictor([0., 0., 0., 0.]).predict("ambiguous")
        self.assertTrue(result["below_threshold"])
        self.assertFalse(result["is_ood"])
    def test_nonfinite_and_wrong_dimensions_fail(self):
        for values in ([1., 0.], [float("nan")]*4, [float("inf")]*4):
            with self.assertRaises(ValueError): self.predictor(values).predict("sample")
    def test_no_model_fails(self):
        with self.assertRaises(ModelNotReadyError): Predictor().predict("sample")
    def test_empty_fails(self):
        with self.assertRaises(ValueError): self.predictor([0.]*4).predict("  ")


class ConversationTests(unittest.TestCase):
    def test_indonesian_response_retains_topic(self):
        result = ResponseManager().get_response("Anxiety",user_message="Aku takut ujian besok")
        self.assertIn("kuliah atau sekolah",result["text"])
    def test_safety_route_is_independent(self):
        self.assertTrue(needs_crisis_support("I want to end my life"))
        self.assertFalse(needs_crisis_support("I want to end this project"))
    def test_current_message_never_evicted_by_history(self):
        from backend import server
        stub = self.predictor_stub()
        original = server._predictor
        server._predictor = stub
        try:
            result = server.chat_endpoint(server.ChatRequest(message="because I failed before",history=[{"role":"user","content":"college exam "*300}]))
            self.assertEqual(stub.seen,"because I failed before")
            self.assertIn("studies",result.response)
        finally: server._predictor=original
    @staticmethod
    def predictor_stub():
        class Stub:
            is_ready=True
            seen=None
            def predict(self,text):
                self.seen=text
                return {"predicted_class":"Anxiety","confidence":0.8,"below_threshold":False,"latency_ms":1.,"probabilities":{"Anxiety":0.8}}
        return Stub()
    def test_rule_response_has_no_model_scores(self):
        from backend import server
        result=server.chat_endpoint(server.ChatRequest(message="Aku cemas menghadapi ujian"))
        self.assertEqual(result.response_source,"support")
        self.assertIsNone(result.confidence)
        self.assertIsNone(result.predicted_class)
        self.assertIsNone(result.probabilities)
    def test_health_and_http_validation(self):
        from backend import server
        client=TestClient(server.app)
        self.assertEqual(client.get('/health').json()['classes'],CLASS_LABELS)
        self.assertEqual(client.post('/api/analyze',json={'message':'   '}).status_code,400)
        self.assertEqual(client.post('/api/chat',json={'message':'x'*4001}).status_code,422)
    def test_unavailable_classifier_and_safety(self):
        from backend import server
        original=server._predictor
        server._predictor=Predictor()
        try:
            client=TestClient(server.app)
            self.assertEqual(client.post('/api/analyze',json={'message':'hello'}).status_code,503)
            result=client.post('/api/chat',json={'message':'I want to end my life'})
            self.assertEqual(result.status_code,200)
            self.assertTrue(result.json()['safety_override'])
            self.assertIsNone(result.json()['confidence'])
        finally: server._predictor=original
