"""Fine-tune a Transformer. Select by validation macro-F1, test once at the end."""
import argparse
import importlib.metadata
import json
import random
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from torch.utils.data import DataLoader, Dataset
from transformers import AutoModelForSequenceClassification, AutoTokenizer, DataCollatorWithPadding

from scripts.download_base_model import MODEL_ID, REVISION
from scripts.prepare_dataset import LABELS, normalized_key, sha256

BASE = Path(__file__).resolve().parents[1]


class TextDataset(Dataset):
    def __init__(self, rows, tokenizer, max_length):
        self.encoded = tokenizer([row["text"] for row in rows], truncation=True, max_length=max_length)
        self.labels = [LABELS.index(row["label"]) for row in rows]

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, index):
        return {**{key: values[index] for key, values in self.encoded.items()}, "labels": self.labels[index]}


def read_splits(directory):
    manifest = json.loads((directory / "manifest.json").read_text())
    splits, seen = {}, set()
    if manifest["class_labels"] != LABELS:
        raise ValueError("Dataset label mapping differs from training configuration")
    for split in ("train", "validation", "test"):
        path = directory / f"{split}.jsonl"
        if sha256(path) != manifest["split_sha256"][split]:
            raise ValueError(f"{split} changed since preparation; regenerate the manifest")
        rows = [json.loads(line) for line in path.read_text().splitlines() if line]
        if set(row["label"] for row in rows) != set(LABELS):
            raise ValueError(f"Missing/unknown labels in {split}")
        for row in rows:
            key = normalized_key(row["text"])
            if not key or key in seen:
                raise ValueError("Empty/duplicate text within or between splits")
            seen.add(key)
        splits[split] = rows
    return splits, manifest


def evaluate(model, loader, device):
    model.eval()
    truth, predictions, total_loss = [], [], 0.0
    with torch.inference_mode():
        for batch in loader:
            batch = {key: value.to(device) for key, value in batch.items()}
            output = model(**batch)
            total_loss += output.loss.item() * len(batch["labels"])
            truth.extend(batch["labels"].cpu().tolist())
            predictions.extend(output.logits.argmax(-1).cpu().tolist())
    report = classification_report(truth, predictions, labels=list(range(len(LABELS))),
                                   target_names=LABELS, output_dict=True, zero_division=0)
    return {"loss": total_loss / len(truth), "accuracy": float(accuracy_score(truth, predictions)),
            "macro_f1": float(report["macro avg"]["f1-score"]),
            "confusion_matrix": confusion_matrix(truth, predictions, labels=list(range(len(LABELS)))).tolist(),
            "per_class": {label: report[label] for label in LABELS}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=BASE / "data/mental_health")
    parser.add_argument("--model", default=str(BASE / ".cache/base-model"))
    parser.add_argument("--revision", default=None, help="Required for a remote model ID")
    parser.add_argument("--output", type=Path, default=BASE / "models/transformer")
    parser.add_argument("--epochs", type=int, default=4)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--max-length", type=int, default=128)
    parser.add_argument("--learning-rate", type=float, default=5e-5)
    parser.add_argument("--max-train-per-class", type=int, default=0, help="0 uses all training examples; evaluation stays complete")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--threads", type=int, default=2)
    args = parser.parse_args()
    if args.epochs < 1 or args.batch_size < 1 or args.max_length < 8 or args.learning_rate <= 0 or args.max_train_per_class < 0 or args.threads < 1:
        parser.error("Invalid training configuration")
    if not Path(args.model).is_dir() and not args.revision:
        parser.error("Pin --revision for a remote model")
    if args.output.exists() and any(args.output.iterdir()):
        parser.error("Output is not empty; choose a fresh --output to preserve existing weights")
    torch.set_num_threads(args.threads)
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    torch.use_deterministic_algorithms(True)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    splits, provenance = read_splits(args.data)
    if args.max_train_per_class:
        rng, subset = random.Random(args.seed), []
        for label in LABELS:
            rows = [row for row in splits["train"] if row["label"] == label]
            rng.shuffle(rows)
            subset.extend(rows[:args.max_train_per_class])
        rng.shuffle(subset)
        splits["train"] = subset
    tokenizer = AutoTokenizer.from_pretrained(args.model, revision=args.revision, trust_remote_code=False)
    model = AutoModelForSequenceClassification.from_pretrained(
        args.model, revision=args.revision, num_labels=len(LABELS),
        id2label=dict(enumerate(LABELS)), label2id={label: i for i, label in enumerate(LABELS)},
        trust_remote_code=False, use_safetensors=True, attn_implementation="eager",
    ).to(device)
    if args.max_length > model.config.max_position_embeddings:
        parser.error("max-length exceeds the checkpoint's context window")
    tokenizer.model_max_length = args.max_length
    model.config.mindcare_max_length = args.max_length
    model.config.mindcare_threshold = 0.55
    model.config.mindcare_language = "en"
    collator = DataCollatorWithPadding(tokenizer=tokenizer)
    loaders = {split: DataLoader(TextDataset(rows, tokenizer, args.max_length),
                                batch_size=args.batch_size, shuffle=split == "train", collate_fn=collator,
                                generator=torch.Generator().manual_seed(args.seed))
               for split, rows in splits.items()}
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate, weight_decay=0.01)
    history = {key: [] for key in ("loss", "accuracy", "val_loss", "val_accuracy", "val_macro_f1")}
    best_f1, best_epoch, started = -1.0, 0, time.monotonic()
    args.output.mkdir(parents=True, exist_ok=True)
    for epoch in range(args.epochs):
        model.train()
        total_loss, correct, count = 0.0, 0, 0
        for step, batch in enumerate(loaders["train"]):
            batch = {key: value.to(device) for key, value in batch.items()}
            optimizer.zero_grad(set_to_none=True)
            output = model(**batch)
            output.loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            n = len(batch["labels"])
            total_loss += output.loss.item() * n
            correct += int((output.logits.argmax(-1) == batch["labels"]).sum().item())
            count += n
            if (step + 1) % 50 == 0:
                print(f"epoch={epoch + 1} step={step + 1}/{len(loaders['train'])} loss={total_loss/count:.4f}", flush=True)
        validation = evaluate(model, loaders["validation"], device)
        for key, value in {"loss": total_loss / count, "accuracy": correct / count,
                           "val_loss": validation["loss"], "val_accuracy": validation["accuracy"],
                           "val_macro_f1": validation["macro_f1"]}.items():
            history[key].append(value)
        print(json.dumps({"epoch": epoch + 1, "validation": {k: validation[k] for k in ("loss", "accuracy", "macro_f1")}}), flush=True)
        if validation["macro_f1"] > best_f1:
            best_f1, best_epoch = validation["macro_f1"], epoch + 1
            model.save_pretrained(args.output, safe_serialization=True)
            tokenizer.save_pretrained(args.output)
    best = AutoModelForSequenceClassification.from_pretrained(args.output, local_files_only=True, use_safetensors=True).to(device)
    validation = evaluate(best, loaders["validation"], device)
    holdout = evaluate(best, loaders["test"], device)
    evidence = {
        "schema_version": 2, "generated_at": datetime.now(timezone.utc).isoformat(),
        "class_labels": LABELS, "architecture": type(best).__name__, "language": "en",
        "base_model": MODEL_ID if Path(args.model).name == "base-model" else args.model,
        "base_revision": REVISION if Path(args.model).name == "base-model" else args.revision,
        "checkpoint_sha256": sha256(args.output / "model.safetensors"),
        "samples": {split: len(rows) for split, rows in splits.items()},
        "per_class_counts": {split: dict(Counter(row["label"] for row in rows)) for split, rows in splits.items()},
        "dataset": provenance,
        "configuration": {"seed": args.seed, "epochs": args.epochs, "batch_size": args.batch_size,
                          "max_length": args.max_length, "learning_rate": args.learning_rate,
                          "max_train_per_class": args.max_train_per_class, "selected_epoch": best_epoch,
                          "selection_metric": "validation_macro_f1", "threshold": 0.55,
                          "threshold_status": "uncalibrated abstention heuristic; not an OOD detector"},
        "runtime": {"device": str(device), "threads": args.threads, "seconds": time.monotonic() - started,
                    "packages": {name: importlib.metadata.version(name) for name in ("torch", "transformers", "scikit-learn", "numpy")}},
        "models": {"Transformer": {"parameters": sum(p.numel() for p in best.parameters()), "validation": validation,
                                   "holdout": holdout, "training_history": history}},
        "limitations": ["English research text categories; not diagnoses or clinical evaluation.",
                        "Source labels/license are publisher-declared; original collection consent was not independently audited.",
                        "Exact text leakage checked; author-level and near-duplicate leakage cannot be ruled out.",
                        "Indonesian, conversational context and OOD detection were not validated."]}
    (args.output / "training_report.json").write_text(json.dumps(evidence, indent=2) + "\n")
    report_dir = BASE / "research/results"
    report_dir.mkdir(parents=True, exist_ok=True)
    (report_dir / "transformer.json").write_text(json.dumps(evidence, indent=2) + "\n")
    print(json.dumps({"output": str(args.output), "samples": evidence["samples"], "holdout": holdout}, indent=2), flush=True)


if __name__ == "__main__":
    main()
