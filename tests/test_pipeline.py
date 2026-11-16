"""Real checkpoint integration tests: native tokenizer, logits, API and weights."""
import unittest
from pathlib import Path
import torch
from config.config import MODEL_PATH, CLASS_LABELS, RESPONSE_MAP, RESPONSE_DIR
from model.model_config import ModelConfig
from model.model_loader import load_model, load_tokenizer
from model.predictor import Predictor
from preprocessing.text_preprocessor import TextPreprocessor


class PipelineTests(unittest.TestCase):
    def test_transformer_checkpoint_runs(self):
        model, error=load_model()
        tokenizer, tok_error=load_tokenizer()
        self.assertIsNone(error)
        self.assertIsNone(tok_error)
        self.assertEqual(model.config.model_type,'bert')
        self.assertFalse(any(isinstance(module,(torch.nn.LSTM,torch.nn.GRU,torch.nn.RNN)) for module in model.modules()))
        prediction=Predictor(model,tokenizer,ModelConfig()).predict('I feel nervous about an upcoming presentation.')
        self.assertEqual(list(prediction['probabilities']),CLASS_LABELS)
        self.assertAlmostEqual(sum(prediction['probabilities'].values()),1.,places=5)
    def test_tokenizer_limits_long_message_and_keeps_special_tokens(self):
        tokenizer, error=load_tokenizer()
        self.assertIsNone(error)
        inputs=tokenizer.prepare_input('A long input. '*300)
        self.assertEqual(inputs['input_ids'].shape,(1,128))
        self.assertEqual(inputs['input_ids'][0,0].item(),tokenizer.tokenizer.cls_token_id)
        self.assertEqual(inputs['input_ids'][0,-1].item(),tokenizer.tokenizer.sep_token_id)
    def test_missing_checkpoint_does_not_download_or_fallback(self):
        model,error=load_model(Path('/tmp/mindcare-missing-checkpoint-test'))
        self.assertIsNone(model)
        self.assertIn('missing',error)
    def test_response_files_remain_available(self):
        for filename in RESPONSE_MAP.values():
            self.assertTrue((RESPONSE_DIR/filename).is_file())
    def test_legacy_cleaner_retains_its_contract(self):
        self.assertEqual(TextPreprocessor().clean_text('<p>HELLO &amp; WORLD</p>'),'hello & world')
