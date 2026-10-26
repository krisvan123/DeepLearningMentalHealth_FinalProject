"use strict";
/**
 * Curated evaluation cases: NOT training data and NOT a clinical benchmark.
 * These are functional regression examples that detect common wrong responses.
 */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ts = require("typescript");

const cache = new Map();
function loadModule(filename) {
  const absolute = path.resolve(__dirname, "../lib", filename);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const js = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    fileName: absolute,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const moduleObj = { exports: {} };
  cache.set(absolute, moduleObj);
  const localRequire = (name) => {
    if (name.startsWith("./")) return loadModule(path.join(path.dirname(filename), name + ".ts"));
    return require(name);
  };
  new Function("require", "module", "exports", js)(localRequire, moduleObj, moduleObj.exports);
  return moduleObj.exports;
}
const { routeConversation, unclearMessageReply } = loadModule("conversation-engine.ts");
const { createGuidedSupport } = loadModule("guided-support.ts");

const rows = [
  ["hiii how are you", "social", "day"],
  ["hello there", "social", "Hi"],
  ["halo apa kabar", "social", "harimu"],
  ["aku lulus ujian", "social", "kabar baik"],
  ["I passed my exam today", "social", "good news"],
  ["I love food", "social", "nice"],
  ["I slept well", "social", "nice"],
  ["Hari ini aku pergi ke kampus", "social", "menarik"],
  ["What is the capital of Japan?", "clarify", "general-knowledge"],
  ["write code in Python", "clarify", "general-knowledge"],
  ["I'm nervous about my interview tomorrow", "guided", "interview"],
  ["Aku takut ujian besok", "guided", "topik"],
  ["I feel overwhelmed by assignments", "guided", "urgent"],
  ["Aku lagi ada masalah dengan keluarga", "guided", "waktu yang lebih tenang"],
  ["Aku dijauhi teman", "guided", "benar-benar terjadi"],
  ["I feel lonely recently", "guided", "messaging"],
  ["I can't sleep at night", "guided", "wind-down"],
  ["I'm grieving because my friend passed away", "guided", "remember"],
  ["I'm worried about my rent and money", "guided", "essentials"],
  ["I feel guilty after eating food", "guided", "restrict"],
  ["I can't stop checking my phone, I'm addicted", "guided", "activity"],
  ["I'm sad and empty lately", "guided", "gentle"],
  ["Aku cemas banget", "support", "tidak"],
  ["I feel stress at work", "guided", "pressure"],
  ["Aku merasa capek", "support", "tidak"],
  ["I am tired", "support", "won't"],
  ["Aku sedih", "support", "Makasih"],
  ["I am sad", "support", "Thanks"],
  ["I just want to vent", "support", "listen"],
  ["Aku cuma mau curhat", "support", "mendengarkan"],
  ["Don't give advice, just listen", "support", "listen"],
  ["Bukan itu maksudku", "clarify", "kurang tepat"],
  ["You misunderstood me", "clarify", "misunderstood"],
  ["Thanks", "social", "welcome"],
  ["Makasih", "social", "Sama"],
  ["Is this depression?", "support", "diagnose"],
  ["Do I have anxiety?", "support", "diagnose"],
  ["Apakah aku mengalami depresi?", "support", "diagnosis"],
  ["How to treat anxiety?", "support", "therapy"],
  ["Treatment for depression?", "support", "therapy"],
  ["Cara mengatasi depresi", "support", "terapi"],
  ["What should I do?", "clarify", "situation"],
  ["Aku butuh bantuan", "clarify", "Situasi"],
  ["I need help", "clarify", "situation"],
  ["yes", "clarify", "talk"],
  ["oke", "clarify", "ceritakan"],
  ["I'm struggling with exams but I passed one", "guided", "topic"],
  ["I was anxious before an interview", "guided", "interview"],
  ["Aku bingung karena banyak tugas numpuk", "guided", "tugas"],
  ["Aku stres soal keuangan", "guided", "uang"],
];

let passed = 0;
const failures = [];
for (const [input, intent, phrase] of rows) {
  const response = routeConversation(input);
  if (!response) {
    failures.push("No response route: " + input);
    continue;
  }
  if (response.method !== intent) {
    failures.push("Wrong route " + response.method + " (expected " + intent + "): " + input);
    continue;
  }
  if (!response.response.toLowerCase().includes(phrase.toLowerCase())) {
    failures.push("Off-topic reply for " + input + ": " + response.response.slice(0,140));
    continue;
  }
  passed++;
}
assert.equal(failures.length, 0, failures.join("\n"));

const oldTopic = [
  { role: "user", content: "I'm worried about an interview tomorrow." },
  { role: "assistant", content: "Try preparing an introduction." },
  { role: "user", content: "I can't think of any examples." },
  { role: "assistant", content: "Could you try?" },
];
const first = routeConversation("what should i do?", oldTopic);
assert.equal(first?.method, "guided", "Must recover a recent earlier USER topic");
assert.equal(first?.topic, "Interview preparation");
const more = routeConversation("i already tried that", oldTopic, first.response);
assert.equal(more?.method, "guided");
assert.match(more.response, /rather than memorising/i);

const switchTopic = routeConversation("I can't sleep lately", oldTopic);
assert.equal(switchTopic?.topic, "Sleep difficulties");
const correction = routeConversation("That's not what I meant", oldTopic);
assert.equal(correction?.method, "clarify");
const neutral = [
  "I love food", "I slept well", "What is an exam?", "The phone has a nice camera",
  "Today I went to class and ate lunch"
];
for (const input of neutral) {
  assert.equal(createGuidedSupport(input), null, "Unnecessary intervention for: " + input);
}
assert.match(unclearMessageReply("aku ga ngerti"), /belum cukup memahami/i);
assert.match(unclearMessageReply("not sure"), /don't have enough context/i);
console.log("Conversation regression corpus: " + passed + " single-turn cases + 9 multi-turn/neutral assertions PASSED.");
