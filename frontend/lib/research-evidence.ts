/**
 * Snapshot of checked-in models/model_metadata.json, last verified 26 Oct 2026.
 * These historic training/validation metrics are NOT a clinical benchmark.
 * Do not add per-class values or plots without real experiment outputs.
 */
export const RESEARCH_EVIDENCE = {
  architecture: "Bi-LSTM (Bidirectional Long Short-Term Memory)",
  classes: ["Addiction", "Anxiety", "Depression", "Eating Disorder", "Suicide", "Neutral", "OOD", "Greeting"],
  trainingSamples: 8000,
  trainAccuracy: 0.7730882167816162,
  validationAccuracy: 0.7450000047683716,
  maxVocabulary: 15000,
  embeddingDimensions: 64,
  lstmUnitsPerDirection: 64,
  maxSequenceLength: 100,
  originalHoldout: null,
  originalF1: null,
  originalConfusionMatrix: null,
  originalPerClassCounts: null,
} as const;
