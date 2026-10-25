# MindCare response-quality remediation (2026-10-25)

MindCare remains an **academic classification + controlled-response prototype**. It
does not provide medical diagnosis, psychotherapy, or reliable clinical triage.

## What changed

- Frontend forwards at most eight recent message turns. The backend uses the
  previous user message only for short ambiguous follow-ups.
- Templates now rotate without starting every session with option 1. They can
  choose a cautious language-specific reply and a topical follow-up.
- Explicit Indonesian greeting/anxiety themes are handled conservatively by
  rules; they are marked with **no neural-network confidence**.
- A limited independent safety-cue route can return support even when the
  classifier is offline. It is **not** comprehensive crisis detection.
- The native OOD class is flagged correctly. Invalid model output dimensions
  and non-finite values now fail explicitly, rather than being silently padded.
- Training source code removes duplicates, splits train/validation/test before
  tokenizer fitting, stops early on validation loss, and reports untouched
  holdout accuracy, macro-F1, per-class scores and confusion matrix.
- Added backend regression tests, frontend build checks, and compatible
  TensorFlow dependency bounds.

## What is NOT fixed by a source-code change alone

The checked-in **models/model_final.h5** and **models/tokenizer.pickle** have
**not been retrained**. The previous model metadata reports validation
accuracy 0.745. This is not a meaningful estimate of clinical sensitivity.
The original training datasets are not included: `dataset_chat/`,
`daily_chat/`, and `worng_context/` are absent and CSV files are gitignored.
Until source data or properly licensed replacements are available, there is
no basis to claim improved classification accuracy or safety.

## How to evaluate

- Run `python -m unittest discover -s tests -p "test_*.py" -v`.
  Tests using mock scores do not measure the quality of the trained weights.
- Install `requirements.txt` to use the real `.h5` model and run
  `python tests/eval_classes.py`. This script is illustrative, not a
  statistically representative benchmark.
- Provide labeled, legally usable training CSVs matching `config/config.py`,
  then run `python -m scripts.train_model`. The new training script reports
  held-out metrics and overwrites artifacts; **review metrics and the output
  before committing new weights**.
- Independently evaluate Indonesian/English data, slang, short follow-ups,
  rejection of out-of-scope inputs, and safety-critical false negatives.
  Calibrate confidence thresholds on validation data, not the holdout.
- For any deployed service, verify the actual frontend API proxy, backend
  health and response with both languages. No production endpoint was
  available for a live deployment check during this remediation.

## Privacy & security notes

Avoid storing raw mental-health messages without explicit consent. This patch
adds no permanent chat storage. Backend CORS is restricted to configured
explicit origins (frontend uses a server-side API proxy). Rate limiting,
retention policy, data minimization, monitoring, accessibility, and human
review of safety responses remain necessary before real-world use.

## Design boundary

A class label like "Depression" is a machine text-category label, not a
diagnosis. Softmax scores must not be presented as clinical certainty.
