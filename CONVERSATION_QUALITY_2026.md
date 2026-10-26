# MindCare Context & Safety Quality Upgrade — 26 October 2026

MindCare is an academic on-device, bilingual text-classification and guided-reflection prototype. **It is not psychotherapy, medical treatment, a diagnosis engine, or an emergency-care service.**

## Why the earlier answers felt unrelated

- Its pretrained Bi-LSTM predicts one of eight **text categories**. Even a very high softmax score does not show it understands the problem.
- Generic response templates were frequently selected when a specific conversation topic or user intent was missing.
- Keyword overlap caused errors (e.g., grief containing the word "friend" could be mistaken for friendship conflict).
- Follow-up turns did not always preserve a user-described issue.
- Its original datasets are **not checked into GitHub**, so source-code changes do not retrain the classifier. The checked-in metadata reports roughly **74.5% validation accuracy** on its former validation split. This is not clinical sensitivity or independent production accuracy.

## What this update implements

1. **Intent-first conversation handling**, before model categorization:
   greeting, positive news, short emotion-only messages, listening preference,
   clarifications, misunderstanding correction, requests for help, general
   questions about diagnosis, care choices, existing diagnoses and concerns
   about professional treatment.
2. **Topic-specific everyday coping suggestions**, retaining the curated
   guidance for school, interviews, workload, relationships, loneliness, grief,
   money, sleep, food-related worries and stress.
3. **Short multi-turn context** referencing the nearest relevant prior
   **user** description, not an AI guess. It avoids reusing an old issue when
   the user raises a new situation.
4. **Conservative fallback** when the text is ambiguous or out of scope,
   instead of issuing a high-confidence but irrelevant clinical category.
5. **Human support resources** from the World Health Organization and
   Indonesia's official Healing119 service in the sidebar.
6. **Developer Mode** explicitly separates academic class estimates from
   guided, social and clarification responses; where no neural inference was
   used, it does not fabricate a class score.
7. **Curated bilingual regression suite** with 50 single-message cases plus
   multi-turn, topic-switching and neutral examples. These are **evaluation
   examples, not newly trained data or clinical validation**.

## How to run the tests

In `frontend/`:

```bash
npm ci
node scripts/test-conversation-intents.cjs
node scripts/test-guided-support.cjs
node scripts/test-conversation-engine.cjs
npm run build
```

GitHub Actions requires those checks, alongside Python backend unit tests.

## Boundaries and responsible use

- Short suggestions are generic self-help options, not treatment plans.
- A real, persistent or disruptive concern warrants help from a qualified
  psychologist, doctor or other professional; immediate danger warrants a
  trusted person or emergency service. MindCare cannot determine clinical risk.
- The legacy eight-class classification still exists for a coursework
  requirement. Model accuracy **has not increased through training** in this
  update; the response engine is separate.
- Rule-based routing can still miss slang, sarcasm, complex emotion and
  highly ambiguous language. We cannot certify this app as a medical device.
- To improve statistical generalization: supply consented, legally usable
  labeled training data; deduplicate; split by source/person; retrain; perform
  per-language, per-class evaluation on a withheld test set; and obtain human
  safety review. Never substitute fabricated benchmark results.

## Public reference material

- WHO — *Doing What Matters in Times of Stress*, a general stress-management
  self-help guide: https://www.who.int/publications/i/item/9789240003927
- Indonesia Ministry of Health — Healing119 psychological support:
  https://kesprimkom.kemkes.go.id/konten/158/151/0/cegah-bunuh-diri-dukung-kesehatan-jiwa-kenali-layanan-healing119-id
- Healing119 access: https://www.healing119.id/ or 119 extension 8. Service
  hours may vary; consult the official website for current availability.

## Deployment model

The frontend continues to download its converted TensorFlow.js Bi-LSTM model
as static Vercel assets. **No LocalTunnel or always-on Python server** is
required for visitor-side inference. Messages are processed locally and are
not sent to a remote inference API by this feature.
