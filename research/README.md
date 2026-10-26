# MindCare — evidence and reproducibility

COMP6826001 Deep Learning final-project evidence package.

## Evidence already present
- Models/model_final.h5 and models/tokenizer.pickle are original model artifacts.
- The historical metadata records 8,000 training examples, 77.31% training
  accuracy and 74.50% validation accuracy.
- The web research laboratory at /analysis **always executes Bi-LSTM** locally,
  separate from chat's guided-response decision rules.
- The /research page discloses dataset provenance gaps and missing holdout metrics.

## Still missing / must not be invented
- Original legally sourced dataset CSVs, source URLs and license/consent records.
- Dataset distribution by class from the original training run.
- Historical confusion matrix, macro-F1, per-class precision/recall, training curves.
- An independent Indonesian-language / safety evaluation.
- New comparative baseline experiment results.
- Final names, contributions, instructor approval, and user-recorded video.

These are **not zero values**. They are unavailable evidence.

## Dataset provenance: before running experiments
1. Find the original private CSVs, verify their origin and license/permission,
   then update research/dataset_manifest.json accurately.
2. Source columns must match scripts/train_model.py. Avoid raw personal identifiers.
3. Do not push private messages, original CSVs or consent forms to a public repo.
4. Install project Python dependencies, then run:
   python -m scripts.compare_models --epochs 8 --samples-per-class 1000
5. If a manifest field is unverified or a source file absent, this command
   intentionally aborts without training or fabricating results.
6. On a real run, review research/results/model_comparison.json and include its
   actual per-class classification report, confusion matrices, and accuracy/loss
   histories in the final report.
7. Further inspect source/person overlap; the current stratified split and
   duplicate-removal cannot prove patient- or author-level independence.

Both baseline LSTM and Bi-LSTM train from scratch on the same split. Their
parameter counts differ, so comparison must discuss architecture capacity.
No treatment or diagnostic claim follows from classifier accuracy.

## For instructor demo
- /analysis — raw eight-class model score distribution.
- /research — methodology, historic figures, dataset rights and missing metrics.
- / — guided-reflection chat, independent from raw classifier outputs.
- docs/FINAL_REPORT_DRAFT.md — truthful academic report source.
- docs/DEMO_VIDEO_PLAN.md — timed ~4-minute recording guide.
- docs/SUBMISSION_CHECKLIST.md — ready/not-ready requirements.
