# MINDCARE: MENTAL HEALTH TEXT CLASSIFICATION USING BIDIRECTIONAL LSTM

**COMP6826001 — Deep Learning Final Project**

**Status: ACADEMIC DRAFT — NOT YET READY FOR FINAL SUBMISSION**

University: BINUS University — School of Computer Science  
Team: [REPLACE WITH APPROVED TEAM NAME]  
Team members and NIM: [REPLACE; DO NOT INVENT]  
Class / semester / lecturer: [CONFIRM WITH INSTRUCTOR]  
Date: October 2026

> Required final format: 10–15 page academic PDF.
> This source is a structured, evidence-grounded draft, **not** a finished PDF.
> Every [NEEDS EVIDENCE] field must be resolved before converting or submitting.
> Do not claim results absent from actual experiment outputs.

---

## Abstract

Mental-health-related conversations contain informal, multilingual and
ambiguous language, making automated text classification challenging.
MindCare is an academic prototype examining the feasibility of a Bidirectional
Long Short-Term Memory (Bi-LSTM) neural network for categorizing text into
eight predefined research classes: Addiction, Anxiety, Depression, Eating
Disorder, Suicide, Neutral, OOD (out-of-distribution), and Greeting.
The project uses Python with TensorFlow/Keras for model implementation,
TensorFlow.js for on-device inference and Next.js for the browser-based user
interface. Existing model metadata records 8,000 training examples, training
accuracy of approximately 77.31%, and validation accuracy of 74.50%.
These figures describe a historic classification experiment rather than
clinical performance. In the web chat, an independent rule-based layer
handles conversational intentions, contextual follow-ups and controlled
supportive suggestions. To distinguish the two mechanisms, MindCare includes
a separate laboratory that always executes the neural classifier directly.
Important limitations include missing original dataset provenance records,
missing historical per-class evaluation metrics, and lack of independent
multilingual and safety testing. This report proposes a reproducible
baseline comparison but makes no claim that it was executed without the
underlying permission-verified datasets.

**Keywords:** Deep Learning, Bi-LSTM, Natural Language Processing, Text
Classification, Responsible AI, TensorFlow.js.

## 1. Introduction

### 1.1 Background

Text classification is a common Natural Language Processing (NLP) task:
given a sentence or document, a model estimates an appropriate category from
a predefined label set. Neural approaches learn representations of words
and their ordering. Bidirectional recurrent networks process the sequence
from both forward and reverse directions, allowing richer context than a
single-direction recurrent network in some tasks [1, 2].

Mental-health-related user text introduces additional challenges.
Descriptions of daily experiences can include fatigue, anxiety, stress,
or positive news without proving a clinical condition. Words can overlap
across categories; emotional context can be missing; and the language and
vocabulary used in deployment can differ from the training corpus.
Automatic predictions must therefore be interpreted as **research text
categories**, not medical assessments.

### 1.2 Problem statement

The prototype addresses a technical question: can an eight-class
Bi-LSTM categorize diverse everyday and mental-health-related text and
expose its predictions in a functional web application? A secondary
engineering problem is ensuring that the final text response remains
contextually appropriate, even though a category score alone cannot
produce coherent multi-turn dialogue.

### 1.3 Objectives

1. Implement a reproducible eight-class text classification pipeline.
2. Expose actual neural inference from a stable browser interface.
3. Distinguish model predictions from guided conversational response rules.
4. Evaluate classification performance with appropriate held-out metrics.
5. Document dataset provenance, limitations, bias, privacy and ethical risks.

### 1.4 Significance and scope

The contribution is a transparent academic demonstration of deep learning,
including data preparation code, trained artifacts, browser inference and
testable user-facing interaction. This is **not** a diagnostic, counseling,
treatment, clinical triage or emergency-response system.

## 2. Related Work

Long Short-Term Memory (LSTM), introduced by Hochreiter and Schmidhuber [1],
uses gating mechanisms to learn dependencies in sequences. Bidirectional
recurrent networks combine left-to-right and right-to-left sequence
information [2]. In practical sequence classification, embeddings transform
token identifiers into vectors and recurrent encoders transform these into
representations suitable for dense classification layers.

Accuracy alone is insufficient for imbalanced multiclass problems.
A class can perform poorly while aggregate accuracy remains high.
Macro-F1, class-wise recall, a confusion matrix and error analysis are
important complementary measures. This project follows that principle
through an optional reproducible experiment script.

**[NEEDS EVIDENCE]** Add 1–2 current, genuinely read and properly cited
NLP mental-health classification research papers. Discuss their datasets,
evaluation limitations and ethical boundaries; do not imply direct
comparability without similar source data and splits.

## 3. Methodology

### 3.1 Dataset design and ethics

MindCare's legacy training code expects five labeled datasets in
dataset_chat (Addiction, Anxiety, Depression, Eating Disorder, Suicide),
a daily_chat source for Neutral/Greeting and a worng_context source
for OOD. The total of 8,000 examples is recorded in historical metadata.
However, individual source URLs, legal permissions, per-class sample counts
and data-collection procedures cannot currently be verified from the
committed repository. The source CSVs are not present.

**[NEEDS EVIDENCE]** Fill the dataset provenance table from authentic
sources (publisher, URL, license/permission, class counts, consent/anonymity,
language distribution, missing-value handling and duplication checks).
Until sources are verified, avoid distributing or retraining on those files.
Document any text normalization and decisions about excluded samples.

### 3.2 Preprocessing

The current code includes text cleaning, tokenization and padding. The
historical architecture metadata specifies a vocabulary ceiling of 15,000
tokens and maximum padded length of 100 tokens. The updated training
script removes exact duplicates and label conflicts and fits tokenization
after train/validation/test separation, reducing a common leakage vector.
These are features of the code **now**, not proof that the original
historical model used the updated split.

### 3.3 Bi-LSTM model architecture

Historical architecture: Embedding (64 dimensions) → Bidirectional LSTM
(64 recurrent units per direction) → Dropout (0.3) → Dense (64, ReLU) →
Dropout (0.2) → Dense (8, softmax). The training implementation specifies
Adam with learning rate 0.001 and sparse categorical crossentropy. Each
output corresponds to a research category, not a clinical condition.
Softmax numbers are not calibrated health risk probabilities.

The Bi-LSTM forms a contextual encoding from the text sequence processed
in both directions; the dense layers map it to scores for eight categories.

### 3.4 Experimental protocol and baseline

**Planned evaluation — NOT YET EXECUTED with verified source data:**

A reproducible script, scripts/compare_models.py, is provided to compare a
unidirectional LSTM with Bi-LSTM. It blocks execution if provenance or
permissions are unverified. Once available, source text is deduplicated,
stratified into train/validation/test (80/10/10), and the tokenizer is fitted
on the training subset alone. Both networks use the same split, vocabulary,
optimizer and training settings, with early stopping. Because the
bidirectional model has additional parameters, the report should examine
performance gains alongside cost and capacity.

If dataset identifiers are available, split by source/user to prevent
leakage across writers. The current stratified split alone does not prove
independent-person generalization.

### 3.5 Metrics

Report on truly untouched test data: accuracy, macro-average precision,
recall, macro-F1, per-class precision/recall/F1, support, confusion matrix,
and train/validation loss curves. Discuss misclassified neutral messages and
out-of-scope queries, language shift and safety-critical false negatives.
Do not treat the conversational regression suite as a statistical test set.

## 4. Implementation and Results

### 4.1 Technology stack

- Model preparation: Python, TensorFlow/Keras, NumPy, pandas, scikit-learn.
- Original artifact: model_final.h5 and tokenizer.pickle.
- Deployment: static converted model weights, TensorFlow.js browser inference.
- Frontend: Next.js, React, TypeScript, Tailwind CSS.
- GitHub CI: Python tests, TypeScript build and chat relevance regression tests.

### 4.2 System flow

Raw analysis mode: text → normalization/tokenization → Bi-LSTM inference →
eight numeric class scores → browser visualization. This laboratory always
executes the neural model; it does not silently substitute a keyword rule.

Chat mode: input → safety/intent detection → contextual response selection →
optional classifier invocation → non-clinical guided response.
Some chat messages intentionally bypass the model when simple social intent
or a request for clarification is clearer than a category estimate.
This is transparent in Developer Mode.

### 4.3 Recorded historical training result

The committed metadata records:

| Historical metric | Recorded value |
| --- | ---: |
| Training examples | 8,000 |
| Last training accuracy | 77.31% |
| Validation accuracy | 74.50% |
| Number of classes | 8 |
| Maximum token vocabulary | 15,000 |
| Maximum sequence length | 100 |

These are inherited from the original model; this development pass did
**not** rerun training or independently reproduce these numbers.

### 4.4 Missing results to be produced

**[NEEDS EVIDENCE]** Add the actual post-experiment comparison table for
baseline LSTM vs Bi-LSTM: dataset counts, parameters, held-out accuracy,
macro-F1, per-class metrics and confusion matrices. Add authentic graphs for
each model's training and validation loss/accuracy. Do not fabricate figures.

### 4.5 Functional evaluation

The repository contains deterministic regression checks for greetings,
Indonesian/English mixed turns, positive news, work/exam stress, generic
fatigue, missing context, scrolling and input usability. The checks do not
constitute formal clinical assessment, and successful tests cannot be
equated with deployment safety.

**[NEEDS EVIDENCE]** Record manual desktop and mobile evaluation outcomes,
device/browser versions, screenshots and meaningful defects found.

## 5. Discussion and Limitations

The validation score (74.50%) reflects historical performance on the
available validation data, not independent real-world effectiveness.
Unverified data rights, data imbalance, English-heavy vocabulary, uncertain
source independence and gaps in per-class metrics limit scientific
interpretation. Future work must validate source permissions, run a
proper baseline, retain holdout reports, calibrate or document scores and
assess multilingual error rates using consented data.

Although guided conversation improves responses on scripted examples,
rules cannot generally infer intent from every ambiguous or emotionally
complex sentence. Professional psychological support must not be replaced
by a classification prototype. Likewise, model confidence must not be
described as a probability of diagnosis.

Privacy is important because emotional reflections can be sensitive.
Public production inference runs in the user's browser, not a third-party
language-model API. Academic experiments must minimize data retention,
avoid committing private texts and document legal rights clearly.

### 5.1 Trade-offs

Browser inference reduces server reliance and external message transmission
but makes the first model download dependent on user connectivity/device
capacity. A Bi-LSTM can model both sequence directions, but is less
transparent than a rule-based baseline and requires representative data.
The separate contextual response engine can reduce visibly wrong replies
without changing the neural model's accuracy.

## 6. Conclusion and Future Work

MindCare demonstrates an operational end-to-end academic text-classification
prototype with a web interface and original eight-class Bi-LSTM weights.
Its laboratory permits observation of actual model outputs, and a separate
guided-response engine supplies constrained conversational support.
The original recorded validation accuracy is 74.50%. The result does not
justify a clinical claim, and completeness of scientific evaluation remains
limited by missing provenance and held-out evidence.

Recommended priorities: establish dataset licensing and permission; run
the same-data LSTM/Bi-LSTM experiments; publish genuine confusion matrices
and per-class metrics; review multilingual robustness and failure cases;
improve accessibility and test the public deployment manually.

## References (IEEE format — verify when finalizing)

[1] S. Hochreiter and J. Schmidhuber, “Long Short-Term Memory,” Neural
Computation, vol. 9, no. 8, pp. 1735–1780, 1997.
DOI: 10.1162/neco.1997.9.8.1735.

[2] M. Schuster and K. K. Paliwal, “Bidirectional Recurrent Neural Networks,”
IEEE Transactions on Signal Processing, vol. 45, no. 11, pp. 2673–2681,
1997. DOI: 10.1109/78.650093.

[3] World Health Organization, “Doing What Matters in Times of Stress: An
Illustrated Guide,” 2020. https://www.who.int/publications/i/item/9789240003927

[4] **[NEEDS EVIDENCE]** Add a directly relevant, properly reviewed
peer-reviewed study on ethically sourced mental-health text classification.

## Appendix A. Repository / software

Repository: https://github.com/krisvan123/DeepLearningMentalHealth_FinalProject

Code:
- scripts/train_model.py
- scripts/compare_models.py
- frontend/lib/browser-inference.ts
- frontend/app/analysis/page.tsx
- frontend/app/research/page.tsx
- research/dataset_manifest.json

## Appendix B. Team contributions (mandatory)

**[NEEDS TEAM CONFIRMATION]** List each member's actual contributions to
data collection, preprocessing, model design/training, web UI, QA, report,
video and Git version control. Record shared activities and coordination.

## Appendix C. Evidence still required for submission

- Authentic dataset licenses, sources and proportions.
- Baseline and Bi-LSTM held-out evaluation on the same split.
- Original charts/tables and discussion of error cases.
- Screenshots from the live application and manual testing logs.
- Team, class, semester, lecturer and contribution statement.
- Human-reviewed demo recording under five minutes.

---

**DRAFT INCOMPLETE:** Before exporting to a 10–15-page PDF, resolve all
[NEEDS EVIDENCE] markers, verify all claims and insert actual experiments.
