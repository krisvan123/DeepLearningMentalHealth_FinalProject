# MindCare — Response Quality v2 (October 2026)

MindCare remains a **Deep Learning classification research prototype**.
Its original 8-class Bi-LSTM still runs on-device with TensorFlow.js.
Its weights and tokenizer **have not been retrained**. Existing
`models/model_metadata.json` reports validation accuracy of 74.5%, which
is **not** a measure of counseling or clinical safety.

## Why responses changed

Previously, the predicted label selected a fixed, generic answer. For example,
a conversation about school could receive a vague "thank you for sharing"
regardless of whether the person needed help preparing for an exam.

The new conversation pipeline is layered:

1. Independent support cues (high priority; limited coverage, not screening).
2. Greetings, questions about the assistant, and positive small talk.
3. Bilingual topic-guided support for **14 practical contexts**: interviews,
   school exams, workload, family disagreements, friendship, sleep difficulties,
   loneliness, grief, financial stress, concerns about food, difficult habits,
   low mood, anxiety and everyday stress.
4. Bi-LSTM category classification remains available for academic inspection.
5. When a clear support topic is detected, the final answer offers one
   **optional, low-risk step** and one relevant follow-up question instead of
   an unrelated model-template answer. Without a clear topic, the controlled
   category fallback now includes an actionable option where appropriate.

For short follow-ups ("what should I do?", "I already tried that"), the
previous **user** topic may be used. If the user says the initial suggestion
did not help, an alternative is offered. New topics replace the previous topic.
Everyday neutral statements and positive news are checked to avoid
unnecessary medical framing.

Developer Mode distinguishes **experimental Bi-LSTM prediction** from the
**topic-guided response method**. A category estimate is not a medical
diagnosis, and a rule-based answer is not neural generation.

## Quality checks

Run inside `frontend/`:

```bash
npm ci
node scripts/test-conversation-intents.cjs
node scripts/test-guided-support.cjs
npm run build
```

The additional regression set covers 12 contextual situations plus multi-turn
advice, bilingual replies, neutral false positives, and positive check-ins.
GitHub Actions runs the same checks on pull requests and the main branch.

## Safety and limitations

- Guidance is deliberately brief and non-clinical. It offers ordinary
  coping options, not medical treatment, medication advice or diagnoses.
- For persistent or disrupting difficulties, it suggests trusted people
  or qualified professionals where appropriate.
- Safety-related wording has independent safeguards, but rule matching and
  the original text classifier **can miss important contexts**. Do not use
  this prototype for clinical screening or emergency response.
- The system is **not an LLM** and cannot reason freely about all user
  situations or provide high-confidence personalized care.
- Multilingual model performance and each class's sensitivity still need
  representative independent evaluation with consented, licensed data.
  Real improvements to model accuracy require access to original datasets,
  retraining and a reserved holdout evaluation.
- Browser inference does not upload message contents to a remote Python
  inference server. Avoid storing sensitive conversations without consent.

## General support references

Guided micro-steps draw on general approaches such as noticing feelings,
grounding, breaking down tasks, and reaching out for support. They are
**not** direct reproductions of proprietary intervention scripts:

- WHO, *Doing What Matters in Times of Stress*:
  https://www.who.int/publications/i/item/9789240003927
- UNICEF Indonesia, *What is stress?*:
  https://www.unicef.org/indonesia/mental-health/article/stress
- UNICEF Indonesia, *How to support your teen during stressful times*:
  https://www.unicef.org/indonesia/how-support-your-teen-during-stressful-times
