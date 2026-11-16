# MindCare: Transformer-based Mental Health Text Classification

**Draft — add team attribution, course requirements and an independent discussion before submission.**

## Objective

Study a pretrained Transformer encoder for English text classification and integrate its actual predictions into a browser application. Source-defined labels are Anxiety, Depression, Normal and Suicidal; they are text categories, not diagnoses.

## Data and method

The public dataset and publisher-declared CC BY 4.0 license are linked in `research/dataset_manifest.json`. The preparation script pins the source revision, computes hashes, excludes conflicting labels and normalized exact overlap, reserves the source-provided test set, and derives stratified validation data. Raw posts are not republished. Lack of author IDs and near-duplicate controls limits leakage claims.

A compact pretrained BERT with two Transformer layers and hidden size 128 is fully fine-tuned using PyTorch and Hugging Face. Seed 42, AdamW, learning rate 5e-5, batch size 32 and maximum length 128 are recorded in the actual experiment. Selection uses validation macro-F1. A smaller subset experiment and a full-data experiment share evaluation splits. Model scores are evaluated using accuracy, macro-F1, per-class precision/recall/F1 and a confusion matrix.

## Results

Use `models/transformer/training_report.json` and the `/research` page as the source for numbers and plots. They describe executed experiments, not expected performance. The previous Bi-LSTM validation score cannot be compared directly because both labels and data changed.

## Application

Next.js runs a numerically verified ONNX export using Transformers.js and local WebAssembly assets. The classifier reads only the current message. Controlled conversation responses can use history and explicitly disclose when a response comes from rules. The optional FastAPI service loads the same checkpoint offline.

## Discussion

Discuss classification errors from the actual confusion matrix, domain differences between training and the source test file, uncertain collection provenance, and the lack of Indonesian or clinical validation. A 55% abstention heuristic is not calibrated certainty. No claims about improved clinical safety follow from the software tests.

## References and remaining submission work

Cite the dataset, its upstream sources, Google BERT checkpoint, BERT paper, Hugging Face Transformers and ONNX. Supply team attribution, course rubric compliance, a real demo recording, and review of the findings before submitting this draft.
