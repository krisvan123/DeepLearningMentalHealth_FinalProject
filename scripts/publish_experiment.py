"""Publish validated numeric results tied to the active checkpoint, without posts."""
import argparse
import json
import math
from pathlib import Path
from scripts.prepare_dataset import LABELS, sha256
BASE = Path(__file__).resolve().parents[1]


def validate_report(value):
    if value.get("schema_version") != 2 or value.get("class_labels") != LABELS or not value.get("generated_at"):
        raise ValueError("Unsupported experiment schema/labels")
    record = value["models"]["Transformer"]
    for split, key in [("validation", "validation"), ("test", "holdout")]:
        result = record[key]
        for metric in ("accuracy", "macro_f1"):
            score = result[metric]
            if not isinstance(score, (int, float)) or not math.isfinite(score) or not 0 <= score <= 1:
                raise ValueError(f"Invalid {metric}")
        matrix = result["confusion_matrix"]
        if len(matrix) != len(LABELS) or any(len(row) != len(LABELS) for row in matrix):
            raise ValueError("Invalid confusion matrix shape")
        if any(type(n) is not int or n < 0 for row in matrix for n in row):
            raise ValueError("Confusion matrix counts must be nonnegative integers")
        total = sum(map(sum, matrix))
        if total != value["samples"][split] or total == 0:
            raise ValueError("Confusion matrix sample count mismatch")
        if not math.isclose(sum(matrix[i][i] for i in range(len(LABELS))) / total, result["accuracy"], abs_tol=1e-10):
            raise ValueError("Accuracy differs from confusion matrix")
        f1_scores = []
        for i, label in enumerate(LABELS):
            tp, support = matrix[i][i], sum(matrix[i])
            predicted = sum(row[i] for row in matrix)
            precision, recall = tp / predicted if predicted else 0, tp / support if support else 0
            f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0
            expected = {"precision": precision, "recall": recall, "f1-score": f1, "support": support}
            if any(not math.isclose(result["per_class"][label][metric], number, abs_tol=1e-10) for metric, number in expected.items()):
                raise ValueError("Per-class scores differ from confusion matrix")
            f1_scores.append(f1)
        if not math.isclose(sum(f1_scores) / len(LABELS), result["macro_f1"], abs_tol=1e-10):
            raise ValueError("Macro-F1 differs from confusion matrix")
    history = record["training_history"]
    if not history.get("loss") or len({len(v) for v in history.values()}) != 1:
        raise ValueError("Missing/inconsistent training history")
    if any(not math.isfinite(n) for values in history.values() for n in values):
        raise ValueError("Nonfinite training history")
    selected = value["configuration"]["selected_epoch"]
    if not 1 <= selected <= len(history["loss"]):
        raise ValueError("Invalid selected epoch")
    if history["val_macro_f1"][selected - 1] != max(history["val_macro_f1"]):
        raise ValueError("Checkpoint must be selected on validation macro-F1")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", type=Path, default=BASE / "models/transformer")
    args = parser.parse_args()
    value = json.loads((args.model / "training_report.json").read_text())
    validate_report(value)
    if sha256(args.model / "model.safetensors") != value["checkpoint_sha256"]:
        raise ValueError("Results do not belong to the active checkpoint")
    # Allow only the known metrics/provenance schema, never arbitrary training text.
    keys = ("schema_version", "generated_at", "class_labels", "architecture", "language", "base_model", "base_revision",
            "checkpoint_sha256", "samples", "per_class_counts", "configuration", "runtime", "limitations")
    clean = {key: value[key] for key in keys}
    record = value["models"]["Transformer"]
    clean["models"] = {"Transformer": {
        "parameters": record["parameters"],
        "training_history": {key: record["training_history"][key] for key in ("loss", "accuracy", "val_loss", "val_accuracy", "val_macro_f1")},
        **{part: {"accuracy": record[part]["accuracy"], "macro_f1": record[part]["macro_f1"],
                  "confusion_matrix": record[part]["confusion_matrix"],
                  "per_class": {label: {metric: record[part]["per_class"][label][metric]
                                        for metric in ("precision", "recall", "f1-score", "support")} for label in LABELS}}
           for part in ("validation", "holdout")}}}
    target = BASE / "frontend/public/research/transformer.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(clean, indent=2) + "\n")
    print("Published checkpoint-matched numeric report:", target)


if __name__ == "__main__":
    main()
