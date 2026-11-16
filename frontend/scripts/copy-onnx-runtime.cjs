const fs = require('node:fs');
const path = require('node:path');
const source = path.resolve(__dirname, '../node_modules/onnxruntime-web/dist');
const target = path.resolve(__dirname, '../public/onnx');
fs.mkdirSync(target, {recursive:true});
for (const file of fs.readdirSync(source)) {
  if (/^ort-wasm.*\.(wasm|mjs)$/.test(file)) fs.copyFileSync(path.join(source,file),path.join(target,file));
}
console.log('Copied pinned ONNX WebAssembly runtime assets.');
