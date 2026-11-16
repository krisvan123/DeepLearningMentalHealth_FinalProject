"""Export the trained Transformer to ONNX and verify PyTorch/ONNX parity."""
import argparse
import json
import shutil
from pathlib import Path
import numpy as np
import onnx
import onnxruntime as ort
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from scripts.prepare_dataset import LABELS, sha256

BASE = Path(__file__).resolve().parents[1]


class LogitsOnly(torch.nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, input_ids, attention_mask, token_type_ids):
        return self.model(input_ids=input_ids, attention_mask=attention_mask, token_type_ids=token_type_ids).logits


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", type=Path, default=BASE / "models/transformer")
    parser.add_argument("--output", type=Path, default=BASE / "frontend/public/models/mindcare-transformer")
    args = parser.parse_args()
    torch.set_num_threads(2)
    report = json.loads((args.model / "training_report.json").read_text())
    if sha256(args.model / "model.safetensors") != report["checkpoint_sha256"]:
        raise ValueError("Weights differ from the evaluated checkpoint")
    tokenizer = AutoTokenizer.from_pretrained(args.model, local_files_only=True)
    model = AutoModelForSequenceClassification.from_pretrained(args.model, local_files_only=True,
                use_safetensors=True, attn_implementation="eager").eval()
    if [model.config.id2label[i] for i in range(model.config.num_labels)] != LABELS:
        raise ValueError("Unexpected label order")
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "onnx").mkdir(exist_ok=True)
    path = args.output / "onnx/model.onnx"
    example = tokenizer("I feel nervous about tomorrow.", return_tensors="pt")
    names = ["input_ids", "attention_mask", "token_type_ids"]
    torch.onnx.export(LogitsOnly(model).eval(), tuple(example[key] for key in names), str(path),
                      input_names=names, output_names=["logits"], opset_version=17,
                      dynamic_axes={**{key: {0: "batch", 1: "sequence"} for key in names}, "logits": {0: "batch"}},
                      dynamo=False)
    onnx.checker.check_model(str(path))
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    session = ort.InferenceSession(str(path), sess_options=options, providers=["CPUExecutionProvider"])
    max_error = 0.0
    cases = [["Hello."], ["I feel nervous about tomorrow.", "I visited a friend today."],
             ["A long context sentence. " * 100 + "Latest message."]]
    for texts in cases:
        batch = tokenizer(texts, truncation=True, max_length=model.config.mindcare_max_length, padding=True, return_tensors="pt")
        with torch.inference_mode():
            reference = model(**batch).logits.numpy()
        actual = session.run(None, {key: batch[key].numpy() for key in names})[0]
        np.testing.assert_allclose(reference, actual, rtol=1e-4, atol=1e-4)
        max_error = max(max_error, float(np.max(np.abs(reference - actual))))
    for name in ("config.json", "tokenizer.json", "tokenizer_config.json", "special_tokens_map.json", "vocab.txt", "LICENSE"):
        if (args.model / name).is_file():
            shutil.copy2(args.model / name, args.output / name)
    # Controlled responses are data, not generative model output.
    from response.response_loader import ResponseLoader
    loader = ResponseLoader()
    responses = {label: loader.get_responses_for_class(label) for label in ["Anxiety", "Depression", "Neutral", "Suicide", "Greeting", "OOD"]}
    runtime = {"classes": LABELS, "threshold": model.config.mindcare_threshold,
               "max_length": model.config.mindcare_max_length, "language": "en", "responses": responses,
               "checkpoint_sha256": report["checkpoint_sha256"], "onnx_sha256": sha256(path),
               "parity_max_absolute_error": max_error, "parity_cases": sum(map(len, cases))}
    (args.output / "runtime.json").write_text(json.dumps(runtime, indent=2) + "\n")
    spec = {key: runtime[key] for key in ("classes", "threshold", "max_length", "language", "checkpoint_sha256")}
    spec["architecture"] = "BERT Transformer (2 layers, 128 hidden units)"
    (BASE / "frontend/lib/model-spec.json").write_text(json.dumps(spec, indent=2) + "\n")
    print(json.dumps({"onnx_bytes": path.stat().st_size, "maximum_logit_error": max_error}, indent=2))


if __name__ == "__main__":
    main()
