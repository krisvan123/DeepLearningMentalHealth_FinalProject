/**
 * On-device MindCare Bi-LSTM inference. No LocalTunnel or Python web service.
 *
 * The trained Keras model is exported into /public/mindcare-model by a CI job;
 * the tokenizer and controlled-response templates are exported alongside it.
 * Predictions are research categories, not diagnoses.
 */
import type { ChatResponse, ChatTurn, ModelStatus } from "./types";
import { recognizeSocialOpening } from "./conversation-intents";
import { createGuidedSupport, generalSupportForClass } from "./guided-support";
import { routeConversation, unclearMessageReply } from "./conversation-engine";
import type * as TF from "@tensorflow/tfjs";

type RuntimeConfig = {
  classes: string[];
  threshold: number;
  max_length: number;
  num_words: number;
  filters: string;
  split: string;
  lower: boolean;
  oov_index: number;
  word_index: Record<string, number>;
  responses: Record<string, string[]>;
};

type Runtime = {
  tf: typeof TF;
  model: TF.LayersModel;
  config: RuntimeConfig;
};

let cachedRuntime: Promise<Runtime> | null = null;

async function loadRuntime(): Promise<Runtime> {
  if (!cachedRuntime) {
    cachedRuntime = (async () => {
      const [tf, response] = await Promise.all([
        import("@tensorflow/tfjs"),
        fetch("/mindcare-model/runtime.json", { cache: "force-cache" }),
      ]);
      if (!response.ok) throw new Error("Browser model metadata is not published yet.");
      const config = (await response.json()) as RuntimeConfig;
      if (!Array.isArray(config.classes) || config.classes.length !== 8) {
        throw new Error("MindCare class metadata is incomplete.");
      }
      await tf.ready();
      const model = await tf.loadLayersModel("/mindcare-model/model.json");
      if (model.outputs[0]?.shape.at(-1) !== config.classes.length) {
        model.dispose();
        throw new Error("Model output does not match category metadata.");
      }
      return { tf, model, config };
    })().catch((err) => {
      cachedRuntime = null; // Allow retry when initial download was interrupted.
      throw err;
    });
  }
  return cachedRuntime;
}

const languageMarkers = /\b(aku|saya|gue|gw|kamu|lagi|banget|nggak|enggak|gak|kuliah|tugas|takut|sedih|capek|halo|hai|cemas|pikiran|kenapa)\b/i;
const anxiousMarkers = /\b(cemas|khawatir|gelisah|panik|takut|deg.degan)\b/i;
const topics: { test: RegExp; english: string; indonesia: string }[] = [
  { test: /\b(exam|class|school|college|university|study|homework|ujian|kuliah|sekolah|kampus|tugas|belajar)\b/i, english: "studies", indonesia: "kuliah atau sekolah" },
  { test: /\b(family|parent|mother|father|keluarga|orang\s*tua|ayah|ibu)\b/i, english: "family", indonesia: "keluarga" },
  { test: /\b(job|office|work|boss|pekerjaan|kerja|kantor|atasan)\b/i, english: "work", indonesia: "pekerjaan" },
  { test: /\b(friend|friends|relationship|teman|sahabat|pertemanan)\b/i, english: "relationships", indonesia: "hubungan dengan orang lain" },
];

const localizedAnswers: Record<string, string> = {
  "Greeting": "Halo! Senang kamu mampir. Ada hal yang ingin kamu ceritakan hari ini?",
  "Neutral": "Terima kasih sudah bercerita. Ada bagian dari pengalaman itu yang ingin kamu bahas lebih lanjut?",
  "Anxiety": "Sepertinya situasi ini membuatmu khawatir. Kita bisa membahasnya pelan-pelan. Bagian mana yang paling mengganggu pikiranmu sekarang?",
  "Depression": "Terima kasih sudah terbuka. Kedengarannya akhir-akhir ini terasa berat. Kamu boleh mulai dari hal yang paling ingin kamu ceritakan.",
  "Eating Disorder": "Perasaan seputar makanan dan tubuh layak ditanggapi tanpa menghakimi. Jika ini mengganggu keseharianmu, tenaga kesehatan atau konselor bisa membantu. Apa yang ingin kamu ceritakan lebih dulu?",
  "Addiction": "Terima kasih sudah jujur tentang kebiasaan yang sedang sulit kamu kendalikan. Kamu bisa mencari dukungan dari tenaga profesional atau orang yang kamu percaya. Apa yang paling sulit akhir-akhir ini?",
  "OOD": "Aku terutama dirancang untuk membantu percakapan tentang perasaan dan kesejahteraan emosional. Kalau mau, kamu bisa cerita tentang hal yang sedang kamu rasakan.",
  "Suicide": "Aku mendengar kamu sedang menghadapi situasi yang sangat berat. Kalau saat ini kamu merasa tidak aman, segera hubungi layanan darurat setempat atau orang dewasa tepercaya yang dapat mendampingimu secara langsung. Kamu layak mendapat bantuan.",
};

// A narrow, independent fallback for urgent support; not clinical screening.
function safetyCue(text: string): boolean {
  return /\b(i\s+(?:want|plan)\s+to\s+(?:die|end\s+my\s+life|hurt\s+myself)|(?:aku|saya|gue|gw)\s+(?:mau|ingin|pengen)\s+(?:bunuh\s+diri|mengakhiri\s+hidup))\b/i.test(text);
}

function simpleTheme(message: string): string | null {
  if (recognizeSocialOpening(message)) return "Greeting";
  if (/\b(aku|saya|gue|gw)\b/i.test(message) && anxiousMarkers.test(message)) return "Anxiety";
  return null;
}

function preprocess(raw: string): string {
  return raw.replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/https?:\/\/\S+|www\.\S+/g, " ")
    .replace(/<[^>]*>/g, " ").replace(/@[A-Za-z0-9_]+/g, " ")
    .replace(/([!?.,;])\1+/g, "$1").toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenize(raw: string, cfg: RuntimeConfig): number[] {
  const normalized = preprocess(raw);
  const text = cfg.lower ? normalized.toLowerCase() : normalized;
  const filterSet = new Set(cfg.filters.split(""));
  let filtered = "";
  for (const char of text) filtered += filterSet.has(char) ? cfg.split : char;
  const words = filtered.split(cfg.split).filter(Boolean);
  const ids = words.map((word) => {
    const idx = cfg.word_index[word] ?? cfg.oov_index;
    return idx >= cfg.num_words ? cfg.oov_index : idx;
  }).slice(0, cfg.max_length);
  while (ids.length < cfg.max_length) ids.push(0);
  return ids;
}

function chooseResponse(
  label: string, userText: string, lastResponse: string | undefined,
  history: ChatTurn[], cfg: RuntimeConfig,
): string {
  const indonesia = languageMarkers.test(userText);
  const templates = cfg.responses[label] || [];
  const actionable = generalSupportForClass(label, userText, lastResponse);
  let answer: string;
  if (label !== "Suicide" && actionable) {
    answer = actionable;
  } else if (indonesia && localizedAnswers[label]) {
    answer = localizedAnswers[label];
  } else if (label === "Greeting") {
    answer = "Hi! Thanks for stopping by. What would you like to talk about?";
  } else if (templates.length) {
    // Stable rotation; avoid repeating identical answer from previous turn.
    let hash = 0;
    for (const char of userText) hash = ((hash * 31) + char.charCodeAt(0)) >>> 0;
    let position = hash % templates.length;
    if (templates.length > 1 && templates[position] === lastResponse) {
      position = (position + 1) % templates.length;
    }
    answer = templates[position];
  } else {
    answer = "Thank you for sharing. Could you tell me more about what you mean?";
  }

  if (!actionable && label !== "Suicide" && ["Neutral", "Anxiety", "Depression"].includes(label)) {
    const previous = [...history].reverse().find((turn) => turn.role === "user")?.content || "";
    const text = (userText.trim().split(/\s+/).length <= 8 ? previous.slice(-500) + " " : "") + userText;
    const topic = topics.find((candidate) => candidate.test.test(text));
    if (topic) {
      answer += indonesia
        ? "\n\nKalau kamu nyaman, bagian mana dari " + topic.indonesia + " yang paling ingin kamu bahas?"
        : "\n\nIf you'd like, which part of " + topic.english + " would you most like to talk through?";
    }
  }
  return answer;
}

export async function getBrowserModelStatus(): Promise<ModelStatus> {
  try {
    const { config } = await loadRuntime();
    return {
      status: "ready", model_ready: true, model_error: null,
      architecture: "Bi-LSTM (browser TensorFlow.js)",
      task: "Multi-class Text Classification",
      num_classes: config.classes.length,
      classes: config.classes,
      confidence_threshold: config.threshold,
    };
  } catch (error) {
    return {
      status: "unavailable", model_ready: false,
      model_error: error instanceof Error ? error.message : "Browser model could not load.",
      architecture: "Bi-LSTM (browser TensorFlow.js)",
      task: "Multi-class Text Classification", num_classes: 8,
      classes: [], confidence_threshold: 0.35,
    };
  }
}

export async function sendBrowserMessage(
  message: string, lastResponse?: string, history: ChatTurn[] = [],
): Promise<ChatResponse> {
  if (!message.trim() || message.length > 4000) throw new Error("Enter a message of at most 4000 characters.");
  // Limited independent support must not be disabled by model-load failures.
  if (safetyCue(message)) {
    return {
      response: languageMarkers.test(message) ? localizedAnswers.Suicide :
        "I'm glad you reached out. If you're not safe right now, contact local emergency services or a trusted person who can help you immediately. You deserve support.",
      predicted_class: "Suicide", is_high_risk: true, is_ood: false,
      safety_override: true, response_source: "safety",
    };
  }

  // Human-readable conversation intent comes before the statistical label.
  // For clear greetings, corrections, questions about care and ambiguous
  // requests, do NOT use a classifier score as proof of understanding.
  const turn = routeConversation(message, history, lastResponse);
  if (turn && turn.method !== "guided") {
    return {
      response: turn.response,
      response_source: turn.method,
      support_topic: turn.topic,
      // No neural inference occurred for an intent-rule reply.
      predicted_class: undefined,
      is_high_risk: false,
      is_ood: false,
    };
  }
  const guided = turn?.method === "guided"
    ? { response: turn.response, topic: turn.topic }
    : createGuidedSupport(message, history, lastResponse);
  let runtime: Runtime;
  try {
    runtime = await loadRuntime();
  } catch (error) {
    // Do not imply that the neural network ran if its files could not load.
    // Bounded, non-clinical guidance is still accessible without inference.
    if (guided) {
      return {
        response: guided.response,
        response_source: "guided",
        support_topic: guided.topic,
        is_high_risk: false,
        is_ood: false,
      };
    }
    throw error;
  }
  const { tf, model, config } = runtime;
  const preceding = [...history].reverse().find((turn) => turn.role === "user")?.content || "";
  const inputText = preceding && message.trim().split(/\s+/).length <= 8
    ? preceding.slice(-1000) + " " + message : message;
  const t0 = performance.now();
  const input = tf.tensor2d([tokenize(inputText, config)], [1, config.max_length], "int32");
  let prediction: TF.Tensor | null = null;
  let scores: number[] = [];
  try {
    const result = model.predict(input);
    prediction = Array.isArray(result) ? result[0] : result;
    scores = Array.from(await prediction.data());
  } finally {
    input.dispose();
    prediction?.dispose();
  }
  if (scores.length !== config.classes.length || scores.some((x) => !Number.isFinite(x))) {
    throw new Error("Unexpected model output.");
  }
  let winner = 0;
  for (let i = 1; i < scores.length; i++) if (scores[i] > scores[winner]) winner = i;
  const rawClass = config.classes[winner];
  const confidence = scores[winner];
  const knownTheme = simpleTheme(message);
  const predictedClass = knownTheme || (confidence < config.threshold ? "OOD" : rawClass);
  // Known real-world situations get a relevant, actionable answer. The
  // Bi-LSTM category remains available for research inspection, but is NOT
  // represented as a clinical diagnosis or the source of guided advice.
  // Independent safety cues and classified crisis support remain higher priority.
  const hasIndependentSafetyCue = safetyCue(message);
  // A neural label by itself is not a diagnosis or a reliable risk assessment.
  // Explicit safety cues are handled above; an unexpected classification
  // gets a gentle check-in rather than an alarming crisis declaration.
  const modelOnlyRisk = predictedClass === "Suicide" && !hasIndependentSafetyCue;
  const useGuidance = Boolean(guided) && !hasIndependentSafetyCue;
  const nonspecific = !guided && !/\b(i|i'm|i've|my|me|aku|saya|gue|gw|merasa|feeling|feel|sad|anxious|worry|worried|stress|stres|cemas|takut|sedih|lonely|kesepian|trouble|difficult|sulit)\b/i.test(message);
  const cautiousReply = modelOnlyRisk
    ? (languageMarkers.test(message)
      ? "Aku ingin memahami situasimu lebih baik tanpa membuat asumsi. Kalau kamu merasa tidak aman saat ini, hubungi orang dewasa tepercaya atau layanan bantuan setempat. Apa yang sedang kamu rasakan?"
      : "I'd like to understand your situation without assuming a diagnosis. If you feel unsafe right now, contact a trusted person or local support service. What are you feeling?")
    : nonspecific || confidence < 0.55
      ? unclearMessageReply(message)
      : null;
  return {
    response: useGuidance && guided
      ? guided.response
      : cautiousReply || chooseResponse(predictedClass, message, lastResponse, history, config),
    response_source: useGuidance ? "guided" : cautiousReply ? "clarify" : "model",
    support_topic: useGuidance ? guided?.topic : undefined,
    predicted_class: cautiousReply ? undefined : predictedClass,
    confidence: knownTheme || Boolean(cautiousReply) ? undefined : confidence,
    is_high_risk: false, // Only independent explicit cues trigger crisis layout.
    is_ood: predictedClass === "OOD",
    latency_ms: performance.now() - t0,
    // Rule overrides do not have a corresponding neural confidence or
    // probability distribution; never show a contradictory developer panel.
    probabilities: knownTheme || useGuidance || Boolean(cautiousReply) ? undefined :
      Object.fromEntries(config.classes.map((category, index) => [category, scores[index]])),
  };
}


/** Direct neural inference for research demonstrations, without chat rules. */
export type ResearchPrediction = {
  predictedClass: string;
  topScore: number;
  belowThreshold: boolean;
  latencyMs: number;
  scores: Array<{ label: string; score: number }>;
};

export async function analyzeTextWithModel(text: string): Promise<ResearchPrediction> {
  if (!text.trim() || text.length > 2000) {
    throw new Error("Please enter 1–2000 characters.");
  }
  const { tf, model, config } = await loadRuntime();
  const started = performance.now();
  const input = tf.tensor2d([tokenize(text, config)], [1, config.max_length], "int32");
  let output: TF.Tensor | null = null;
  let values: number[];
  try {
    const prediction = model.predict(input);
    output = Array.isArray(prediction) ? prediction[0] : prediction;
    values = Array.from(await output.data());
  } finally {
    input.dispose();
    output?.dispose();
  }
  if (values.length !== config.classes.length || values.some(value => !Number.isFinite(value) || value < 0)) {
    throw new Error("Invalid output from the Bi-LSTM model.");
  }
  const ranked = config.classes.map((label, index) => ({ label, score: values[index] }))
    .sort((a,b) => b.score-a.score);
  return {
    predictedClass: ranked[0].label,
    topScore: ranked[0].score,
    belowThreshold: ranked[0].score < config.threshold,
    latencyMs: performance.now()-started,
    scores: ranked,
  };
}
