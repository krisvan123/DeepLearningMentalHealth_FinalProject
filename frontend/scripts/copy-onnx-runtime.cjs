// Copies the ONNX Runtime WebAssembly files that the browser loads from /onnx/.
// public/onnx/ is gitignored, so every install/build must regenerate it.
// Without these files the deployed site reports the model as unavailable.
const fs = require('node:fs');
const path = require('node:path');
const source = path.resolve(__dirname, '../node_modules/onnxruntime-web/dist');
const target = path.resolve(__dirname, '../public/onnx');
if (!fs.existsSync(source)) {
  console.error(`onnxruntime-web is not installed (${source} missing). Run npm ci first.`);
  process.exit(1);
}
fs.mkdirSync(target, {recursive:true});
const copied = [];
for (const file of fs.readdirSync(source)) {
  if (/^ort-wasm.*\.(wasm|mjs)$/.test(file)) {
    fs.copyFileSync(path.join(source,file),path.join(target,file));
    copied.push(file);
  }
}
if (!copied.some(file => file.endsWith('.wasm'))) {
  console.error('No ONNX Runtime .wasm files were copied; the browser model would fail to load.');
  process.exit(1);
}
console.log(`Copied ${copied.length} ONNX WebAssembly runtime assets to public/onnx/.`);
