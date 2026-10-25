"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Import the pure TypeScript conversation helpers without needing TensorFlow.
const file = path.resolve(__dirname, "../lib/guided-support.ts");
const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  }
}).outputText;
const moduleRef = { exports: {} };
new Function("module", "exports", compiled)(moduleRef, moduleRef.exports);
const { createGuidedSupport, generalSupportForClass } = moduleRef.exports;

const scenarios = [
  ["Aku takut karena ujian besok", "School and exam stress", "Pilih satu topik"],
  ["I'm nervous about my interview tomorrow", "Interview preparation", "introduction"],
  ["I am overwhelmed by assignments", "Overwhelm and workload", "ten minutes"],
  ["Aku lagi ada masalah dengan keluarga", "Family tension", "waktu yang lebih tenang"],
  ["I feel lonely recently", "Loneliness", "messaging"],
  ["I can't sleep at night", "Sleep difficulties", "wind-down routine"],
  ["I feel guilty after eating food", "Difficult feelings around food", "don't need"],
  ["I'm sad and empty lately", "Low mood", "gentle activity"],
  ["Aku stres banget", "Everyday stress", "berhenti sebentar"],
  ["I am worried about money", "Money worries", "essentials"],
  ["Aku merasa dijauhi teman", "Friendship and relationships", "benar-benar terjadi"],
  ["I'm addicted to checking my phone", "Habits and compulsive behavior", "alternative activity"],
];
for (const [input, topic, phrase] of scenarios) {
  const result = createGuidedSupport(input);
  assert.ok(result, "No support generated for: " + input);
  assert.equal(result.topic, topic, input);
  assert.ok(result.response.includes(phrase), "Expected practical step for: " + input);
  assert.ok(result.response.includes("?"), "Expected a relevant follow-up question");
}

assert.equal(createGuidedSupport("I love food"), null);
assert.equal(createGuidedSupport("I slept well"), null);
assert.equal(createGuidedSupport("What is an exam?"), null);
assert.equal(createGuidedSupport("The phone has a nice camera"), null);
assert.equal(createGuidedSupport("hi"), null);
assert.equal(createGuidedSupport("What is Python?"), null);

const context = [{ role: "user", content: "I am worried about my interview tomorrow" }];
const followup = createGuidedSupport("what should I do?", context);
assert.equal(followup?.topic, "Interview preparation");
const repeat = createGuidedSupport("i already tried that", context, followup.response);
assert.equal(repeat?.topic, "Interview preparation");
assert.ok(repeat.response.includes("rather than memorising"), "Must not repeat the failed advice");

const unrelated = createGuidedSupport("I can't sleep lately", context);
assert.equal(unrelated?.topic, "Sleep difficulties", "New topic must replace old context");

const baseline = generalSupportForClass("Anxiety", "Aku khawatir");
assert.match(baseline, /lingkungan/);
assert.notEqual(generalSupportForClass("Anxiety", "Aku khawatir", baseline), baseline);
assert.match(generalSupportForClass("Depression", "I'm feeling down"), /can't determine/);
assert.equal(generalSupportForClass("Greeting", "hello"), null);
console.log("Guided-support quality checks: PASS (" + scenarios.length + " detailed scenarios + context + neutral guards).");
