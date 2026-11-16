"""Compare executed Transformer reports using the same evaluation splits.

Usage: python -m scripts.compare_models report1.json report2.json
Selection uses validation macro-F1, never test scores.
"""
import argparse
import json
from pathlib import Path
from scripts.publish_experiment import validate_report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("reports", nargs="+", type=Path)
    args = parser.parse_args()
    reference, results = None, []
    for path in args.reports:
        report = json.loads(path.read_text())
        validate_report(report)
        evaluation = {key: report["dataset"]["split_sha256"][key] for key in ("validation", "test")}
        if reference is not None and reference != evaluation:
            raise ValueError("Experiments use different evaluation splits")
        reference = evaluation
        model = report["models"]["Transformer"]
        results.append({"report": str(path), "base_model": report["base_model"], "samples": report["samples"],
                        "validation_macro_f1": model["validation"]["macro_f1"],
                        "test_macro_f1": model["holdout"]["macro_f1"], "test_accuracy": model["holdout"]["accuracy"]})
    print(json.dumps(sorted(results, key=lambda row: row["validation_macro_f1"], reverse=True), indent=2))


if __name__ == "__main__":
    main()
