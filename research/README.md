# Research evidence

The active pipeline is Transformer-only. See `models/transformer/training_report.json` for executed metrics and `dataset_manifest.json` for sources, attribution and publisher-declared license.

`results/subset_baseline.json` records a compact 8,000-example run. The full-data experiment uses the same validation/test files and is selected by validation macro-F1, never test accuracy. Use `python -m scripts.compare_models <report1> <report2>` to compare reports only when their evaluation hashes match.

Raw datasets are ignored. Downloads, normalized deduplication, conflicting-label removal, class counts and checksums are reproducible through `python -m scripts.prepare_dataset`. Source-specific and near-duplicate leakage remain limitations. Do not interpret source-defined text categories as medical diagnoses.

`legacy/model_metadata.json` preserves historical Bi-LSTM figures solely for provenance; those figures are not comparable to the new task.
