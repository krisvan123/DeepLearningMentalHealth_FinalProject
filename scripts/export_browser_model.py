"""Export existing trained Keras Bi-LSTM and tokenizer as static browser assets.

Run in GitHub Actions; source .h5 / tokenizer.pickle remain the authoritative
artifacts. Do NOT generate a new random model if loading or conversion fails.
"""
from __future__ import annotations

import json
import pickle
from pathlib import Path

import tensorflow as tf
import tensorflowjs as tfjs

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend" / "public" / "mindcare-model"
MODEL = ROOT / "models" / "model_final.h5"
TOKENIZER = ROOT / "models" / "tokenizer.pickle"
METADATA = ROOT / "models" / "model_metadata.json"


def main() -> None:
    if not all(x.is_file() for x in (MODEL, TOKENIZER, METADATA)):
        raise FileNotFoundError("Original weights, tokenizer and metadata are required")
    OUT.mkdir(parents=True, exist_ok=True)

    with METADATA.open(encoding="utf-8") as file:
        metadata = json.load(file)
    with TOKENIZER.open("rb") as file:
        tokenizer = pickle.load(file)

    network = tf.keras.models.load_model(str(MODEL), compile=False)
    tfjs.converters.save_keras_model(network, str(OUT))
    labels = metadata["class_labels"]
    if network.output_shape[-1] != len(labels):
        raise ValueError("Model output class count mismatches metadata labels")
    word_index = tokenizer.word_index
    vocab_limit = int(tokenizer.num_words or metadata.get("max_vocab_size", 15000))
    vocabulary = {word: idx for word, idx in word_index.items() if idx < vocab_limit}
    oov_index = word_index.get(tokenizer.oov_token or "", 1)

    responses = {}
    files = {
        "Addiction": "addiction.txt",
        "Anxiety": "anxiety.txt",
        "Depression": "depression.txt",
        "Eating Disorder": "eating_disorder.txt",
        "Suicide": "suicide.txt",
        "Neutral": "neutral.txt",
        "OOD": "ood.txt",
        "Greeting": "greeting.txt",
    }
    for category, path in files.items():
        content = (ROOT / "respon" / path).read_text(encoding="utf-8")
        responses[category] = [x.strip() for x in content.split("---") if x.strip()]
        if not responses[category]:
            raise ValueError(f"No responses configured for {category}")

    config = {
        "classes": labels,
        "threshold": float(metadata.get("confidence_threshold", 0.35)),
        "max_length": int(metadata.get("max_sequence_length", 100)),
        "num_words": vocab_limit,
        "filters": tokenizer.filters,
        "split": tokenizer.split,
        "lower": bool(tokenizer.lower),
        "oov_index": int(oov_index),
        "word_index": vocabulary,
        "responses": responses,
    }
    (OUT / "runtime.json").write_text(
        json.dumps(config, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    print(
        f"Exported {len(labels)} classes and {len(vocabulary)} tokenizer entries; "
        f"assets: {[p.name for p in OUT.iterdir()]}"
    )


if __name__ == "__main__":
    main()
