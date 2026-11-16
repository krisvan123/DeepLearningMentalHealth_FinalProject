"""Fetch the pinned Apache-2.0 BERT checkpoint without executing remote code."""
import argparse
from pathlib import Path
from scripts.prepare_dataset import download

MODEL_ID = "google/bert_uncased_L-2_H-128_A-2"
REVISION = "30b0a37ccaaa32f332884b96992754e246e48c5f"
BASE = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=BASE / ".cache/base-model")
    args = parser.parse_args()
    for name in ["config.json", "vocab.txt", "model.safetensors", "README.md"]:
        download(f"https://huggingface.co/{MODEL_ID}/resolve/{REVISION}/{name}", args.output / name)
        print(f"Downloaded {name}", flush=True)


if __name__ == "__main__":
    main()
