# Executed validation

- Selected full-data BERT checkpoint: `b629b75679fed7d2e3adb4fd45ab12a47ed07055d4729ff91e59ffa5981b20dc`.
- Training/validation/test: 41156 / 7263 / 992.
- Validation macro-F1: 0.792445; test accuracy: 0.736895; test macro-F1: 0.737776.
- 23 Python tests passed against the selected checkpoint, including actual inference, HTTP validation, missing-model behavior, latest-message preservation, data leakage fixtures and report integrity.
- Frontend: conversation, guided-response, demo and research-evidence tests passed; actual ONNX inference verified.
- Next.js production build and production route smoke tests passed.
- Headless Chromium: actual on-device classification at /analysis, real metrics at /research, Indonesian greeting chat and mobile-width overflow check passed. No page errors or external requests were observed during that check.
- PyTorch/ONNX logits matched within 1.5e-6 absolute error on four export cases.

These are software and source-dataset checks, not external or clinical validation. The smaller 8,000-example experiment is retained separately; the full-data checkpoint was selected using validation macro-F1, not test results. Deployment on the public production site was not performed during this change.
