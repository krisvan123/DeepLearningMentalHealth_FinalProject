/** Real exported Transformer inference in the Node CPU runtime; no remote models. */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
(async () => {
  const {env, AutoTokenizer, AutoModelForSequenceClassification} = await import('@huggingface/transformers');
  env.allowRemoteModels = false;
  env.localModelPath = path.resolve(__dirname, '../public/models') + '/';
  const spec = JSON.parse(fs.readFileSync(path.resolve(__dirname,'../lib/model-spec.json'),'utf8'));
  const tokenizer = await AutoTokenizer.from_pretrained('mindcare-transformer');
  const model = await AutoModelForSequenceClassification.from_pretrained('mindcare-transformer',{dtype:'fp32',device:'cpu'});
  try {
    for (const text of ['Hello.', 'I feel anxious about tomorrow.', 'Today was a quiet day. '.repeat(60)]) {
      const inputs = tokenizer(text,{truncation:true,max_length:spec.max_length});
      assert.ok(inputs.input_ids.dims[1] <= spec.max_length);
      const result = await model(inputs);
      assert.equal(result.logits.data.length,spec.classes.length);
      assert.ok(Array.from(result.logits.data).every(Number.isFinite));
    }
    assert.deepEqual(spec.classes.map((_,i)=>model.config.id2label[i]),spec.classes);
    console.log('Real ONNX Transformer inference passed for short, normal and truncated inputs.');
  } finally { await model.dispose(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
