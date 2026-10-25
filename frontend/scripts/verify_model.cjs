/**
 * Sanity-check converted model using the SAME pure-JS TensorFlow.js engine
 * that browsers use. Fails CI before any converted weights are published.
 */
const fs = require("node:fs");
const path = require("node:path");
const tf = require("@tensorflow/tfjs");

async function main() {
  const root = path.join(__dirname, "..", "public", "mindcare-model");
  const artifact = JSON.parse(fs.readFileSync(path.join(root, "model.json"), "utf8"));
  const config = JSON.parse(fs.readFileSync(path.join(root, "runtime.json"), "utf8"));
  const manifest = artifact.weightsManifest;
  if (!manifest || manifest.length === 0) throw new Error("No weight manifest");
  const specs = manifest.flatMap((entry) => entry.weights);
  const chunks = manifest.flatMap((entry) =>
    entry.paths.map((file) => fs.readFileSync(path.join(root, file)))
  );
  const data = Buffer.concat(chunks);
  const bytes = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const handler = tf.io.fromMemory({
    modelTopology: artifact.modelTopology,
    weightSpecs: specs,
    weightData: bytes,
  });
  const model = await tf.loadLayersModel(handler);
  const input = tf.tensor2d([new Array(config.max_length).fill(0)], [1, config.max_length], "int32");
  const output = model.predict(input);
  const scores = Array.from(await output.data());
  if (scores.length !== config.classes.length || !scores.every(Number.isFinite)) {
    throw new Error("Inference returned invalid probabilities");
  }
  console.log("TensorFlow.js inference OK:", scores.length, "categories; sum", scores.reduce((a,b)=>a+b,0));
  input.dispose();
  output.dispose();
  model.dispose();
}
main().catch((err) => { console.error(err); process.exitCode = 1; });
