/** Release metadata must describe the actual deployed model and its experiment. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const spec=read('lib/model-spec.json');
const runtime=read('public/models/mindcare-transformer/runtime.json');
const report=read('public/research/transformer.json');
assert.equal(spec.checkpoint_sha256,runtime.checkpoint_sha256);
assert.equal(spec.checkpoint_sha256,report.checkpoint_sha256);
assert.deepEqual(spec.classes,report.class_labels);
const bytes=fs.readFileSync(path.join(root,'public/models/mindcare-transformer/onnx/model.onnx'));
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),runtime.onnx_sha256);
const matrix=report.models.Transformer.holdout.confusion_matrix;
assert.equal(matrix.flat().reduce((a,b)=>a+b,0),report.samples.test);
console.log('Research evidence matches the deployed Transformer and actual test counts.');
