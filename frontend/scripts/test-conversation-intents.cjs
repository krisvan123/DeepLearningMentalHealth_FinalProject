"use strict";
/* Minimal no-dependency behavior checks for social-message routing. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const typescript = require("typescript");

const filename = path.resolve(__dirname, "../lib/conversation-intents.ts");
const source = fs.readFileSync(filename, "utf8");
const compiled = typescript.transpileModule(source, {
  compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2020 },
}).outputText;
const unit = { exports: {} };
new Function("module", "exports", compiled)(unit, unit.exports);
const { recognizeSocialOpening, isIndonesianOpening, socialOpeningReply } = unit.exports;

for (const input of [
  "hiii how are you", "hiii how are you?", "hi how r u", "hey, how are you?",
  "How are you?", "How's it going?", "HELLO how are you",
]) {
  assert.equal(recognizeSocialOpening(input), "checkin", input);
  assert.match(socialOpeningReply(input), /how has your day/i, input);
}

for (const input of ["hi", "hiii", "hello", "helloooo!!", "hey", "halo", "hai!", "selamat pagi"]) {
  assert.equal(recognizeSocialOpening(input), "greeting", input);
}

for (const input of ["apa kabar?", "halo apa kabar?", "gimana kabarmu?"]) {
  assert.equal(recognizeSocialOpening(input), "checkin", input);
  assert.equal(isIndonesianOpening(input), true, input);
  assert.match(socialOpeningReply(input), /gimana harimu/i, input);
}

for (const input of [
  "hi, I'm afraid my exam is tomorrow",
  "hiii how are you? I feel very worried about my exams",
  "I'm feeling anxious",
  "I need help with a difficult situation",
  "",
]) {
  assert.equal(recognizeSocialOpening(input), null, input);
}

console.log("Social greeting/check-in recognition: PASS (English + Indonesian; scoped matching).");
