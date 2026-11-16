---
title: MindCare Transformer API
emoji: 🧠
colorFrom: gray
colorTo: black
sdk: docker
app_port: 7860
pinned: false
---

# MindCare — Transformer-based Mental Health Text Classification

MindCare is a deep learning coursework project using **BERT Transformers only** for neural classification. It fine-tunes a pretrained encoder with PyTorch / Hugging Face and runs the same checkpoint in the browser using Transformers.js / ONNX. Next.js hosts the interface; a FastAPI backend is also available for local experiments.

The four English **text categories** are `Anxiety`, `Depression`, `Normal` and `Suicidal`, retaining the dataset's names. They are not diagnoses. Chat responses are controlled templates/rules, explicitly distinguished from model predictions. The Transformer is a classifier, not a generative chatbot. Indonesian guidance stays unscored because the classifier has not been validated in Indonesian.

## Run the website

Use Node.js 22+:

```bash
cd frontend
ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci
npm run dev
```

Open http://localhost:3000. `/analysis` always runs actual Transformer inference. `/research` shows checkpoint-matched test metrics, confusion matrix, per-class scores and training curves. The trained ONNX checkpoint is included; no API key or Python inference server is required for the website. On first use, about 18 MB of model weights plus the WebAssembly runtime are downloaded. User text is processed on the device.

The build copies the pinned WebAssembly runtime to local static files, avoiding CDN dependence. For Vercel, use `frontend` as the root directory, `npm run build` as the build command, and set `ONNXRUNTIME_NODE_INSTALL_CUDA=skip` for dependency installation. No obsolete LocalTunnel address is used.

## Dataset and provenance

Source: [ourafla / Mental Health Text Classification Dataset](https://huggingface.co/datasets/ourafla/Mental-Health_Text-Classification_Dataset/tree/e47ef4f68a0d28d9f174cb8af2323400b14f1a73), revision `e47ef4f68a0d28d9f174cb8af2323400b14f1a73`.

The publisher declares **CC BY 4.0**. Attribution and upstream sources are recorded in [research/dataset_manifest.json](research/dataset_manifest.json). This is a publisher license declaration, not an independent audit of original collection consent. Raw social-media posts are downloaded locally into ignored `data/` and are not republished in this repository or website.

The pinned files actually contain 49,612 training rows and 992 test rows. Preparation removes contradictory labels and normalized exact duplicates, including training/test overlaps. The source test split stays reserved. A stratified 15% of the remaining training pool becomes validation. The resulting pool contains **41,156 train / 7,263 validation / 992 test** examples. The report records actual counts, class distributions and SHA-256 checksums; the dataset card's different row count is not silently copied.

## Reproduce training and browser export

Use Python 3.12. A GPU is optional; the included compact model was trained on CPU.

```bash
python -m venv .venv
source .venv/bin/activate
pip install torch==2.6.0 --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements-dev.txt
python -m scripts.prepare_dataset
python -m scripts.download_base_model
python -m scripts.train_transformer --epochs 4 --output models/new-run
python -m scripts.export_browser_model --model models/new-run
python -m scripts.publish_experiment --model models/new-run
```

Training refuses to overwrite a nonempty output directory. To run a smaller experiment, add `--max-train-per-class 2000`; validation and test remain complete. The base checkpoint is [Google BERT L-2 H-128 A-2](https://huggingface.co/google/bert_uncased_L-2_H-128_A-2), pinned to revision `30b0a37ccaaa32f332884b96992754e246e48c5f` (Apache 2.0). All encoder weights are fine-tuned; no CNN, LSTM or recurrent fallback remains.

Checkpoint selection uses validation macro-F1 only. The test split is evaluated after selection. `training_report.json` records the selected epoch, training history, real metrics, runtime versions and source fingerprints. The exporter checks PyTorch/ONNX numerical parity, and the publisher refuses mismatched weights or inconsistent confusion matrices. Review a new experiment before replacing the active `models/transformer/` directory and exporting its browser counterpart together.

## Optional Python API

```bash
python -m backend.server
```

- `GET /health` returns actual checkpoint readiness.
- `POST /api/analyze` accepts `{"message":"I feel nervous about tomorrow."}` and returns raw category scores.
- `POST /api/chat` adds controlled response routing and optional bounded history.

Set `MINDCARE_MODEL_PATH` to select another locally trained checkpoint. Inference loads local safetensors only; it does not download a model or silently initialize random weights. The classifier receives the current message, matching its training distribution. History is used by conversation routing, so old context cannot push a short new message out of the token window.

## Verification

```bash
python -m unittest discover -s tests -p 'test_*.py' -v
cd frontend
npm test
npm run build
node scripts/smoke-production.cjs
```

CI checks data leakage fixtures, score integrity, real checkpoint inference, conversation regressions and production builds. Unit tests are not evidence of classification quality; see [the executed experiment](models/transformer/training_report.json).

## Limitations

The threshold of 0.55 is a provisional abstention rule, not calibrated certainty or proven OOD detection. The dataset lacks reliable author IDs, so normalized exact deduplication cannot exclude near-duplicate or author-level leakage. Source-provided test results do not establish clinical performance, Indonesian performance or generalization to private conversations. Explicit crisis support is an independent rule, not a clinical risk assessment.

The previous eight-class Bi-LSTM used different labels and data. Its historical 74.5% validation accuracy is not directly comparable with this experiment. Historical documentation is preserved in `docs/archive/`; active results are linked above. Additional benchmarking should use validation data for decisions and a fresh external test set for independent claims.
