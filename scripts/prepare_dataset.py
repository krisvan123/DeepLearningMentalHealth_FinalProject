"""Download pinned research data and create disjoint train/validation/test splits."""
import argparse
import csv
import hashlib
import json
import random
import unicodedata
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
LABELS = ["Anxiety", "Depression", "Normal", "Suicidal"]
DATASET = "ourafla/Mental-Health_Text-Classification_Dataset"
REVISION = "e47ef4f68a0d28d9f174cb8af2323400b14f1a73"
FILES = {"train": "mental_heath_unbanlanced.csv", "test": "mental_health_combined_test.csv"}
CHECKSUMS = {"train": "d41cdc3ec3b8dde8f5553accaccd1a01a59c1440d83d7af6856fab77605c9471",
             "test": "2806f9518b92915b11ea35b16955ac3826fb5d981fc5f9152ee2282f7cffa418"}


def normalized_key(text):
    return " ".join(unicodedata.normalize("NFKC", text).casefold().split())


def download(url, path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".part")
    try:
        with urllib.request.urlopen(url, timeout=90) as response, temporary.open("wb") as out:
            while chunk := response.read(1024 * 1024):
                out.write(chunk)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def read_source(path):
    rows, dropped = [], 0
    with Path(path).open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not {"text", "status"}.issubset(reader.fieldnames or []):
            raise ValueError("Source CSV must contain text and status columns")
        for row in reader:
            text, label = (row["text"] or "").strip(), (row["status"] or "").strip()
            if not text or not label:
                dropped += 1
                continue
            if label not in LABELS:
                raise ValueError(f"Unexpected source label: {label!r}")
            rows.append({"text": text, "label": label})
    return rows, dropped


def clean_splits(train_rows, test_rows, seed=42, validation_fraction=0.15):
    """Remove conflicts everywhere. Preserve published test, exclude train overlap.

    Exact normalized matching does not establish author/near-duplicate isolation.
    """
    if not 0 < validation_fraction < 1:
        raise ValueError("validation_fraction must be between 0 and 1")
    labels_by_key = defaultdict(set)
    for row in train_rows + test_rows:
        labels_by_key[normalized_key(row["text"])].add(row["label"])
    conflicts = {key for key, labels in labels_by_key.items() if len(labels) > 1}
    seen, test, train = set(conflicts), [], []
    removed = {"conflicting_texts": len(conflicts), "duplicate_or_conflicting_test_rows": 0,
               "duplicate_overlapping_or_conflicting_train_rows": 0}
    for name, rows, output in [("test", test_rows, test), ("train", train_rows, train)]:
        for row in rows:
            key = normalized_key(row["text"])
            if key in seen:
                field = "duplicate_or_conflicting_test_rows" if name == "test" else "duplicate_overlapping_or_conflicting_train_rows"
                removed[field] += 1
                continue
            seen.add(key)
            output.append(row)
    rng, final_train, validation = random.Random(seed), [], []
    for label in LABELS:
        pool = [row for row in train if row["label"] == label]
        if len(pool) < 10 or not any(row["label"] == label for row in test):
            raise ValueError(f"Insufficient independent samples for {label}")
        rng.shuffle(pool)
        n = max(1, round(len(pool) * validation_fraction))
        validation.extend(pool[:n])
        final_train.extend(pool[n:])
    for rows in (final_train, validation, test):
        rng.shuffle(rows)
    return {"train": final_train, "validation": validation, "test": test}, removed


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=BASE / "data/mental_health")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    inputs, sources, empty = {}, {}, {}
    for split, filename in FILES.items():
        url = f"https://huggingface.co/datasets/{DATASET}/resolve/{REVISION}/{filename}"
        path = args.output / "raw" / filename
        download(url, path)
        if sha256(path) != CHECKSUMS[split]:
            raise ValueError(f"Downloaded {split} file does not match the verified source checksum")
        inputs[split], empty[split] = read_source(path)
        sources[split] = {"url": url, "sha256": sha256(path), "rows": len(inputs[split])}
    splits, removed = clean_splits(inputs["train"], inputs["test"], args.seed)
    hashes = {}
    for split, rows in splits.items():
        path = args.output / f"{split}.jsonl"
        path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")
        hashes[split] = sha256(path)
    report = {"dataset": DATASET, "revision": REVISION, "seed": args.seed,
              "language": "en", "class_labels": LABELS, "sources": sources,
              "split_sha256": hashes, "dropped_empty": empty, "removed": removed,
              "samples": {name: len(rows) for name, rows in splits.items()},
              "per_class": {name: dict(Counter(row["label"] for row in rows)) for name, rows in splits.items()},
              "limitations": "Exact normalized deduplication only; no author/group IDs. Near-duplicate and cross-domain generalization remain unverified."}
    (args.output / "manifest.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
