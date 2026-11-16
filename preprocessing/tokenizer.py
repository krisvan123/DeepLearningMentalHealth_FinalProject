"""Checkpoint-native tokenization; never prepend history to the current message.

Training data consists of single messages. Conversation history is used only by
response routing, so a short new message cannot be truncated behind old text.
"""
from pathlib import Path
from config.config import MAX_SEQUENCE_LENGTH, TOKENIZER_PATH


class TokenizerWrapper:
    def __init__(self, tokenizer_obj=None, max_length=MAX_SEQUENCE_LENGTH):
        self.tokenizer = tokenizer_obj
        self.max_length = max_length

    @classmethod
    def load_from_file(cls, tokenizer_path=TOKENIZER_PATH, max_length=None):
        from transformers import AutoTokenizer
        path = Path(tokenizer_path)
        if not (path / "tokenizer.json").is_file():
            raise FileNotFoundError("Trained Transformer tokenizer is missing")
        tokenizer = AutoTokenizer.from_pretrained(path, local_files_only=True, trust_remote_code=False)
        return cls(tokenizer, max_length or int(tokenizer.model_max_length))

    def prepare_input(self, text):
        if not self.is_ready:
            raise RuntimeError("Tokenizer is unavailable")
        return self.tokenizer(text.strip(), truncation=True, max_length=self.max_length, return_tensors="pt")

    @property
    def is_ready(self):
        return self.tokenizer is not None
