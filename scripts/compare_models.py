"""Reproducible LSTM-vs-BiLSTM comparison on permission-verified CSVs only.

Run: python -m scripts.compare_models --epochs 8
Writes NUMERIC evaluation data only to research/results/model_comparison.json.
Does not overwrite deployed model weights. Never fabricates missing data.
"""
import argparse
import json
import os
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))


def ensure_permissions(manifest_path):
    manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    entries = manifest.get("entries", [])
    if len(entries) != 8:
        raise ValueError("Dataset manifest requires eight labeled entries.")
    issues = []
    for entry in entries:
        path = BASE / entry.get("path", "")
        if (entry.get("permission_status") != "verified" or
                not entry.get("source_url") or
                not entry.get("license_or_permission") or not path.is_file()):
            issues.append(entry.get("path", "(unknown)"))
    if issues:
        raise ValueError("Missing verified dataset file/source rights: " + ", ".join(issues))


def evaluate(y_true, probabilities, labels):
    import numpy as np
    from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
    pred = np.argmax(probabilities, axis=1)
    ids = list(range(len(labels)))
    report = classification_report(y_true, pred, labels=ids, target_names=labels,
                                   output_dict=True, zero_division=0)
    return {
        "accuracy": float(accuracy_score(y_true, pred)),
        "macro_f1": float(report["macro avg"]["f1-score"]),
        "per_class": report,
        "confusion_matrix": confusion_matrix(y_true, pred, labels=ids).tolist()
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=8)
    parser.add_argument("--samples-per-class", type=int, default=1000)
    parser.add_argument("--manifest", type=Path, default=BASE / "research/dataset_manifest.json")
    parser.add_argument("--output", type=Path, default=BASE / "research/results/model_comparison.json")
    args = parser.parse_args()
    if not (1 <= args.epochs <= 100 and 50 <= args.samples_per_class <= 100000):
        parser.error("Invalid epoch or sample count.")
    try:
        ensure_permissions(args.manifest)
    except (ValueError, OSError) as exc:
        parser.error(str(exc))

    import numpy as np
    import tensorflow as tf
    from sklearn.model_selection import train_test_split
    from config.config import CLASS_LABELS, EMBEDDING_DIM, LSTM_UNITS, MAX_SEQUENCE_LENGTH, MAX_VOCAB_SIZE
    from scripts.train_model import load_balanced_data

    random.seed(42)
    np.random.seed(42)
    tf.random.set_seed(42)
    texts, classes = load_balanced_data(samples_per_class=args.samples_per_class)
    train_text, hold_text, train_y, hold_y = train_test_split(
        texts, classes, test_size=0.20, stratify=classes, random_state=42)
    val_text, test_text, val_y, test_y = train_test_split(
        hold_text, hold_y, test_size=0.50, stratify=hold_y, random_state=42)

    tokenizer = tf.keras.preprocessing.text.Tokenizer(num_words=MAX_VOCAB_SIZE,
                                                       oov_token="<OOV>")
    tokenizer.fit_on_texts(train_text)

    def encode(items):
        return tf.keras.preprocessing.sequence.pad_sequences(
            tokenizer.texts_to_sequences(items), maxlen=MAX_SEQUENCE_LENGTH,
            padding="post", truncating="post")

    x_train, x_val, x_test = (encode(items) for items in (train_text, val_text, test_text))
    y_train, y_val, y_test = (np.asarray(items, dtype=np.int32)
                              for items in (train_y, val_y, test_y))
    results = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "class_labels": CLASS_LABELS,
        "experiment_kind": "fresh training on identical 80/10/10 stratified splits",
        "samples": {"total": len(texts), "train": len(train_text),
                    "validation": len(val_text), "test": len(test_text)},
        "configuration": {"seed": 42, "epochs_limit": args.epochs, "batch_size": 64},
        "models": {}
    }
    for name, is_bidirectional in [("LSTM_baseline", False), ("BiLSTM", True)]:
        core = tf.keras.layers.LSTM(LSTM_UNITS)
        recurrent = tf.keras.layers.Bidirectional(core) if is_bidirectional else core
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(MAX_SEQUENCE_LENGTH,), dtype="int32"),
            tf.keras.layers.Embedding(MAX_VOCAB_SIZE, EMBEDDING_DIM),
            recurrent, tf.keras.layers.Dropout(0.3),
            tf.keras.layers.Dense(64, activation="relu"),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(len(CLASS_LABELS), activation="softmax")
        ])
        model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
                      loss="sparse_categorical_crossentropy", metrics=["accuracy"])
        history = model.fit(
            x_train, y_train, validation_data=(x_val, y_val), epochs=args.epochs,
            batch_size=64, verbose=2,
            callbacks=[tf.keras.callbacks.EarlyStopping(
                monitor="val_loss", patience=3, restore_best_weights=True)])
        predictions = model.predict(x_test, verbose=0)
        results["models"][name] = {
            "parameters": int(model.count_params()),
            "holdout": evaluate(y_test, predictions, CLASS_LABELS),
            "training_history": {key: [float(value) for value in vals]
                                 for key, vals in history.history.items()}
        }
        tf.keras.backend.clear_session()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(".tmp")
    temporary.write_text(json.dumps(results, indent=2), encoding="utf-8")
    os.replace(temporary, args.output)
    print("Saved authentic experiment results to", args.output)


if __name__ == "__main__":
    main()
