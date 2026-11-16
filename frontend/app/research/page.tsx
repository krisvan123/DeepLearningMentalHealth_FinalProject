import Link from "next/link";
import { ExperimentResults } from "@/components/Research/ExperimentResults";
import spec from "@/lib/model-spec.json";

export default function ResearchPage() {
  return <main className="min-h-[100dvh] bg-white text-mono-900">
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-9">
      <nav className="flex justify-between text-sm"><Link href="/">← Back to MindCare</Link><Link href="/analysis" className="underline">Open model laboratory</Link></nav>
      <header className="space-y-3"><p className="text-xs uppercase tracking-widest text-mono-500">Transformer research project</p>
        <h1 className="text-3xl font-bold">Dataset, Methodology &amp; Evaluation</h1>
        <p className="text-mono-600">A fine-tuned BERT encoder classifies English text into four source-defined categories. The results below belong to the deployed checkpoint; chat guidance uses separate, explicitly identified rules.</p>
      </header>
      <section className="space-y-3"><h2 className="font-bold text-xl">Executed Transformer experiment</h2><ExperimentResults /></section>
      <section className="space-y-3"><h2 className="font-bold text-xl">Dataset source and license</h2>
        <p className="text-sm leading-relaxed"><a className="underline" href="https://huggingface.co/datasets/ourafla/Mental-Health_Text-Classification_Dataset/tree/e47ef4f68a0d28d9f174cb8af2323400b14f1a73">Mental Health Text Classification Dataset — ourafla</a> declares CC BY 4.0 and provides English text labeled Anxiety, Depression, Normal and Suicidal. It combines public source corpora; labels are dataset categories, not clinical diagnoses. The original collection consent was not independently audited.</p>
        <p className="text-sm text-mono-600">Downloads use a pinned revision and SHA-256 checksums. Exact normalized duplicates and contradictory labels are removed before deriving a stratified validation set. The published test split is reserved and matching training texts are excluded. Raw posts are not included in this repository or website.</p>
        <p className="text-sm text-mono-600">There are no reliable author identifiers: near-duplicate and author-level leakage cannot be ruled out. This test is a source-provided benchmark, not independent clinical validation.</p>
      </section>
      <section className="space-y-3"><h2 className="font-bold text-xl">Model and methodology</h2>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <Info title="Architecture" value={spec.architecture}/><Info title="Tokenizer" value="Checkpoint-native WordPiece, 128-token maximum"/>
          <Info title="Training" value="PyTorch + Hugging Face; pretrained encoder fully fine-tuned"/><Info title="Browser inference" value="Same checkpoint exported to ONNX; Transformers.js + WebAssembly"/>
        </dl>
        <ol className="list-decimal pl-5 space-y-2 text-sm"><li>Verify downloaded files and exclude duplicated or conflicting texts.</li><li>Train only on the training split; select the checkpoint by validation macro-F1.</li><li>Evaluate that checkpoint on the held-out test split and publish actual counts, scores and curves.</li><li>Check numerical parity between PyTorch and ONNX before exporting browser assets.</li></ol>
      </section>
      <section className="rounded-xl border border-mono-300 bg-mono-50 p-5 space-y-2 text-sm"><h2 className="font-bold">Scope and limitations</h2>
        <p>The classifier reads the current message only, matching its training data. Conversation rules can use history without replacing the newest message in the model input. Indonesian guidance is unscored; Indonesian model performance is not established.</p>
        <p>The 55% abstention threshold is a provisional rule, not calibrated confidence or a proven out-of-distribution detector. This is not a therapy, diagnosis or crisis assessment service.</p>
        <p>The former Bi-LSTM validation score used different labels and data; it cannot be directly compared with this experiment.</p>
      </section>
    </div>
  </main>;
}
function Info({title,value}:{title:string;value:string}) {
  return <div className="border border-mono-200 rounded-xl p-4"><dt className="text-xs text-mono-500">{title}</dt><dd className="mt-1">{value}</dd></div>;
}
