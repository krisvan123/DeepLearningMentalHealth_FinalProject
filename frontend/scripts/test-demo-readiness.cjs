"use strict";
/**
 * Demo readiness regression set. Curated UI/conversation cases, NOT model
 * training data or a clinical safety evaluation.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const cache = new Map();
function loadModule(filename) {
  const absolute = path.resolve(__dirname, "../lib", filename);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const code = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  cache.set(absolute, module);
  const localRequire = (name) => name.startsWith("./")
    ? loadModule(path.join(path.dirname(filename), name + ".ts"))
    : require(name);
  new Function("require", "module", "exports", code)(localRequire, module, module.exports);
  return module.exports;
}
const { routeConversation } = loadModule("conversation-engine.ts");

// Actual six messages reported by the user, evaluated in an ongoing chat.
const samples = [
  {
    input: "Aku capek banget hari ini.",
    method: "support",
    include: /mau cerita|didengarkan/i,
    exclude: /semua tugas|tugas paling mendesak|tenggat/i,
  },
  {
    input: "Aku capek banget karena tugas kuliah numpuk.",
    method: "guided",
    topic: "Overwhelm and workload",
    include: /tugas|prioritas/i,
  },
  {
    input: "I feel exhausted today.",
    method: "support",
    include: /what happened|simply listened/i,
    exclude: /Makasih|kamu|tugas/i,
  },
  {
    input: "What is the capital of Japan?",
    method: "clarify",
    include: /MindCare is designed|general-knowledge/i,
    exclude: /lebih cocok|kamu/i,
  },
  {
    input: "Aku sedang stres karena pekerjaan.",
    method: "guided",
    topic: "Stress at work",
    include: /pekerjaan|tempat kerja/i,
    exclude: /tugas sekolah|ujian/i,
  },
  {
    input: "I'm doing great today!",
    method: "social",
    include: /good news|pleased/i,
    exclude: /mental health|well-being|general factual answers/i,
  }
];

const history = [];
for (const sample of samples) {
  const last = [...history].reverse().find(x => x.role === "assistant")?.content;
  const result = routeConversation(sample.input, history.slice(-8), last);
  assert.ok(result, "No route for: " + sample.input);
  assert.equal(result.method, sample.method, "Wrong route for: " + sample.input);
  if (sample.topic) assert.equal(result.topic, sample.topic, sample.input);
  assert.match(result.response, sample.include, sample.input);
  if (sample.exclude) assert.doesNotMatch(result.response, sample.exclude, sample.input);
  history.push({ role: "user", content: sample.input });
  history.push({ role: "assistant", content: result.response });
}

// Repeat and recovery: same problem must not recycle the exact same advice.
const stressHistory = [
  { role: "user", content: "Aku lagi banyak tugas kuliah numpuk." },
  { role: "assistant", content: "Coba pilih satu tugas yang paling dekat tenggat." },
];
const initial = routeConversation("Aku capek karena tugas numpuk", stressHistory);
const alternative = routeConversation(
  "Aku sudah coba tapi belum membantu",
  stressHistory.concat([{ role: "user", content: "Aku capek karena tugas numpuk" },
    { role: "assistant", content: initial.response }]),
  initial.response,
);
assert.equal(alternative?.method, "guided");
assert.equal(alternative?.topic, "Overwhelm and workload");
assert.match(alternative.response, /tidak perlu dipaksakan|belum cocok/i);
assert.notEqual(initial.response, alternative.response);

// A known new topic must take precedence over any previous inferred one.
const newTopic = routeConversation("I can't sleep lately", history);
assert.equal(newTopic?.topic, "Sleep difficulties");
assert.match(newTopic.response, /sleep/i);

// Structural UI safeguards: the input is editable while the reply is pending,
// messages own their scrolling, and the composer cannot grow with chat content.
const input = fs.readFileSync(path.resolve(__dirname, "../components/Chat/ChatInput.tsx"), "utf8");
const windowSource = fs.readFileSync(path.resolve(__dirname, "../components/Chat/ChatWindow.tsx"), "utf8");
const page = fs.readFileSync(path.resolve(__dirname, "../app/page.tsx"), "utf8");
assert.match(input, /disabled=\{disabled\}\s+className=/, "Draft must stay editable during loading.");
assert.match(input, /disabled=\{!input\.trim\(\) \|\| isLoading \|\| disabled\}/,
  "Only sending must be blocked until the current response completes.");
assert.doesNotMatch(windowSource, /bottomRef\.current\?\.scrollIntoView/,
  "Chat auto-scroll must not move the outer page.");
assert.match(windowSource, /min-h-0.*overflow-y-auto/, "Chat panel must be independently scrollable.");
assert.match(page, /h-\[100dvh\]/, "Page must honor mobile dynamic viewport.");
assert.match(page, /flex-col min-h-0 min-w-0 overflow-hidden/,
  "Chat pane must shrink rather than cover its composer.");
console.log("Demo readiness PASSED: 6 sequential chat cases, follow-up/context, and layout/input invariants.");
