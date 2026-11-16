---
language: en
license: apache-2.0
library_name: transformers
pipeline_tag: text-classification
base_model: google/bert_uncased_L-2_H-128_A-2
---
# MindCare BERT Transformer

Fine-tuned from Google's Apache-2.0 BERT L-2 H-128 A-2 at revision 30b0a37ccaaa32f332884b96992754e246e48c5f.
Model weights: Apache 2.0, retaining the base model's license; see LICENSE.
Source: https://huggingface.co/google/bert_uncased_L-2_H-128_A-2

Task: research classification of English text into Anxiety, Depression, Normal and Suicidal (dataset labels, not diagnoses).
Dataset: https://huggingface.co/datasets/ourafla/Mental-Health_Text-Classification_Dataset
Dataset revision and publisher-declared CC BY 4.0 attribution: ../../research/dataset_manifest.json.

Training: 41,156 examples, four epochs, all encoder weights fine-tuned on CPU. Checkpoint selected at epoch 4 by validation macro-F1 (0.792445).
Test: 992 reserved examples, accuracy 0.736895, macro-F1 0.737776.
Full methodology, per-class results, confusion matrices, runtime and source hashes are in training_report.json.

Limitations: English only, source-defined nonclinical labels, no author IDs, near-duplicate leakage not ruled out, source test is not independent clinical validation. Softmax scores and the 0.55 abstention heuristic are not calibrated certainty or risk estimates. Do not use for diagnosis or crisis assessment.
