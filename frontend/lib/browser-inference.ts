/** On-device Transformer inference; all model and tokenizer assets are local. */
import type { ChatResponse, ChatTurn, ModelStatus } from "./types";
import { createGuidedSupport, generalSupportForClass } from "./guided-support";
import { routeConversation, unclearMessageReply } from "./conversation-engine";
import type { PreTrainedModel, PreTrainedTokenizer } from "@huggingface/transformers";
import spec from "./model-spec.json";

type RuntimeConfig = { classes: string[]; threshold: number; max_length: number; language: string;
  responses: Record<string, string[]>; checkpoint_sha256: string };
type Runtime = { model: PreTrainedModel; tokenizer: PreTrainedTokenizer; config: RuntimeConfig };
let cachedRuntime: Promise<Runtime> | null = null;

async function loadRuntime(): Promise<Runtime> {
  if (!cachedRuntime) {
    cachedRuntime = (async () => {
      const { env, AutoTokenizer, AutoModelForSequenceClassification } = await import("@huggingface/transformers");
      env.allowRemoteModels = false;
      env.allowLocalModels = true;
      env.localModelPath = "/models/";
      env.backends.onnx.wasm!.wasmPaths = "/onnx/";
      env.backends.onnx.wasm!.numThreads = 1;
      const response = await fetch("/models/mindcare-transformer/runtime.json", { cache: "no-cache" });
      if (!response.ok) throw new Error("Trained Transformer assets are unavailable.");
      const config = await response.json() as RuntimeConfig;
      if (JSON.stringify(config.classes) !== JSON.stringify(spec.classes) ||
          config.checkpoint_sha256 !== spec.checkpoint_sha256 || config.max_length !== spec.max_length ||
          config.threshold !== spec.threshold) throw new Error("Model assets do not match this release. Reload the page.");
      const tokenizer = await AutoTokenizer.from_pretrained("mindcare-transformer");
      const model = await AutoModelForSequenceClassification.from_pretrained("mindcare-transformer", { dtype: "fp32", device: "wasm" });
      const labels = (model.config as unknown as { id2label: Record<string, string> }).id2label;
      if (config.classes.some((label, i) => labels?.[i] !== label)) {
        await model.dispose();
        throw new Error("Transformer labels do not match dataset metadata.");
      }
      return { model, tokenizer, config };
    })().catch(error => { cachedRuntime = null; throw error; });
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
    await loadRuntime();
    return { status: "ready", model_ready: true, model_error: null,
      architecture: spec.architecture, task: "Multi-class Text Classification", num_classes: spec.classes.length,
      classes: spec.classes, confidence_threshold: spec.threshold };
  } catch (error) {
    return { status: "unavailable", model_ready: false,
      model_error: error instanceof Error ? error.message : "Transformer could not load.",
      architecture: spec.architecture, task: "Multi-class Text Classification", num_classes: spec.classes.length,
      classes: spec.classes, confidence_threshold: spec.threshold };
  }
}

export async function sendBrowserMessage(message: string, lastResponse?: string, history: ChatTurn[] = []): Promise<ChatResponse> {
  if (!message.trim() || message.length > 4000) throw new Error("Enter 1–4000 characters.");
  if (safetyCue(message)) return {
    response: languageMarkers.test(message) ? localizedAnswers.Suicide :
      "If you feel unsafe right now, contact local emergency services or someone you trust who can stay with you. You deserve support.",
    is_high_risk: true, safety_override: true, response_source: "safety", is_ood: false,
  };
  const turn = routeConversation(message, history, lastResponse);
  if (turn) return { response: turn.response, response_source: turn.method, support_topic: turn.topic,
    is_high_risk: false, is_ood: false };
  const guided = createGuidedSupport(message, history, lastResponse);
  if (guided) return { response: guided.response, response_source: "guided", support_topic: guided.topic,
    is_high_risk: false, is_ood: false };
  // This checkpoint was trained/evaluated in English. Indonesian guidance stays unscored.
  if (languageMarkers.test(message)) return { response: unclearMessageReply(message), response_source: "clarify",
    is_high_risk: false, is_ood: false };
  const prediction = await analyzeTextWithModel(message);
  if (prediction.belowThreshold || prediction.predictedClass === "Suicidal") return {
    response: prediction.predictedClass === "Suicidal"
      ? "I'd like to understand without making assumptions. If you feel unsafe right now, contact local emergency services or someone you trust. What are you feeling?"
      : unclearMessageReply(message), response_source: "clarify", is_high_risk: false, is_ood: false,
    latency_ms: prediction.latencyMs,
  };
  const { config } = await loadRuntime();
  const responseLabel = prediction.predictedClass === "Normal" ? "Neutral" : prediction.predictedClass;
  return { response: chooseResponse(responseLabel, message, lastResponse, history, config),
    response_source: "model", predicted_class: prediction.predictedClass, confidence: prediction.topScore,
    probabilities: Object.fromEntries(prediction.scores.map(item => [item.label, item.score])),
    latency_ms: prediction.latencyMs, is_high_risk: false, is_ood: false };
}

export type ResearchPrediction = { predictedClass: string; topScore: number; belowThreshold: boolean;
  latencyMs: number; scores: Array<{ label: string; score: number }> };

/** Single-message analysis matches training; old context cannot evict the latest text. */
export async function analyzeTextWithModel(text: string): Promise<ResearchPrediction> {
  if (!text.trim() || text.length > 4000) throw new Error("Enter 1–4000 characters.");
  const { model, tokenizer, config } = await loadRuntime();
  const started = performance.now();
  const inputs = tokenizer(text.trim(), { truncation: true, max_length: config.max_length });
  const output = await model(inputs);
  const logits = Array.from(output.logits.data as Float32Array);
  if (logits.length !== config.classes.length || logits.some(value => !Number.isFinite(value))) {
    throw new Error("Invalid Transformer output.");
  }
  const maximum = Math.max(...logits);
  const exps = logits.map(value => Math.exp(value - maximum));
  const sum = exps.reduce((a, b) => a + b, 0);
  const scores = config.classes.map((label, i) => ({ label, score: exps[i] / sum })).sort((a,b) => b.score-a.score);
  return { predictedClass: scores[0].label, topScore: scores[0].score,
    belowThreshold: scores[0].score < config.threshold, latencyMs: performance.now() - started, scores };
}
