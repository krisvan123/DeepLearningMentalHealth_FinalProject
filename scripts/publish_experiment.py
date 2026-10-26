"""Publish a metrics-only experiment snapshot to the Vercel static frontend.

Run ONLY after verified dataset permissions and actual model comparison:
  python -m scripts.publish_experiment
This does not include raw samples or private texts.
"""
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent


def main():
    source = BASE / "research/results/model_comparison.json"
    destination = BASE / "frontend/public/research/model_comparison.json"
    if not source.is_file():
        raise SystemExit("No real experiment output found. First run compare_models.py on verified datasets.")
    value = json.loads(source.read_text(encoding="utf-8"))
    labels = value.get("class_labels", [])
    if len(labels) != 8 or not value.get("generated_at"):
        raise SystemExit("Experiment schema incomplete; refusing to publish.")
    models = value.get("models", {})
    for name in ("LSTM_baseline", "BiLSTM"):
        record = models.get(name, {})
        holdout = record.get("holdout", {})
        matrix = holdout.get("confusion_matrix")
        history = record.get("training_history", {})
        if not isinstance(matrix, list) or len(matrix) != 8 or any(len(row) != 8 for row in matrix):
            raise SystemExit(f"Invalid confusion matrix for {name}")
        if not isinstance(history.get("loss"), list) or not history["loss"]:
            raise SystemExit(f"Missing real loss history for {name}")
        for metric in ("accuracy", "macro_f1"):
            if not isinstance(holdout.get(metric), (int, float)) or not 0 <= holdout[metric] <= 1:
                raise SystemExit(f"Invalid {metric} for {name}")
    # Retain only numeric metadata. Never publish dataset text or identifiers.
    clean = {
        "class_labels": labels, "generated_at": value["generated_at"],
        "samples": value["samples"],
        "models": {
            name: {
                "parameters": models[name]["parameters"],
                "holdout": {
                    metric: models[name]["holdout"][metric]
                    for metric in ("accuracy","macro_f1","confusion_matrix")
                },
                "training_history": models[name]["training_history"]
            } for name in ("LSTM_baseline","BiLSTM")
        }
    }
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(clean, indent=2)+"\n", encoding="utf-8")
    print("Review and commit verified metrics-only file:", destination)


if __name__ == "__main__":
    main()
