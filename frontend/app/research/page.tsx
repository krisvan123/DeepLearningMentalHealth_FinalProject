import Link from "next/link";
import { ArrowLeft, Database, FlaskConical, ShieldAlert, BarChart3 } from "lucide-react";
import { RESEARCH_EVIDENCE as facts } from "@/lib/research-evidence";

const sources = [
  ["Addiction", "dataset_chat/FullAddiction.csv"],
  ["Anxiety", "dataset_chat/FullAnxiety.csv"],
  ["Depression", "dataset_chat/FullDepression.csv"],
  ["Eating Disorder", "dataset_chat/FullEatingDisorder.csv"],
  ["Suicide", "dataset_chat/FullSuicide.csv"],
  ["Neutral", "daily_chat/train.csv"],
  ["Greeting", "daily_chat/train.csv"],
  ["OOD", "worng_context/train.csv"],
];
const percent = (x:number)=>(x*100).toFixed(2)+"%";

export default function ResearchPage(){
  return (
    <main className="min-h-[100dvh] bg-white text-mono-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-10">
        <nav className="flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Research navigation">
          <Link href="/" className="inline-flex gap-2 items-center text-mono-600 hover:text-black"><ArrowLeft className="w-4 h-4"/> Back to MindCare</Link>
          <Link href="/analysis" className="font-semibold underline underline-offset-4">Open model laboratory</Link>
        </nav>
        <header className="max-w-3xl space-y-3">
          <span className="text-xs tracking-widest uppercase text-mono-500 inline-flex gap-2 items-center"><FlaskConical className="w-4 h-4"/> Course Project Evidence</span>
          <h1 className="font-bold text-3xl sm:text-4xl tracking-tight">Dataset, Methodology &amp; Evaluation</h1>
          <p className="text-mono-600 leading-relaxed">A transparent record of the original MindCare Bi-LSTM project. The historical model figures below are verified against committed metadata. Missing evidence is marked as missing, never estimated.</p>
        </header>
        <section className="space-y-4" aria-labelledby="overview">
          <h2 id="overview" className="font-bold text-xl inline-flex items-center gap-2"><BarChart3 className="w-5 h-5"/> Recorded training metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Metric title="Training examples (recorded)" value={facts.trainingSamples.toLocaleString("en-US")}/>
            <Metric title="Last training accuracy" value={percent(facts.trainAccuracy)}/>
            <Metric title="Validation accuracy" value={percent(facts.validationAccuracy)}/>
          </div>
          <p className="text-xs text-mono-600 leading-relaxed">Source: <code>models/model_metadata.json</code> (historical artifact, not rerun during this update). Training accuracy and validation accuracy refer to different splits. Training accuracy does not measure production chatbot relevance or healthcare performance.</p>
          <div className="border border-mono-200 rounded-xl p-4 text-sm space-y-2">
            <h3 className="font-semibold">Evaluation fields not available in the original artifact</h3>
            <p className="text-mono-600">Independent holdout accuracy: <strong>not recorded</strong>. Macro-F1: <strong>not recorded</strong>. Per-class precision/recall/F1: <strong>not recorded</strong>. Confusion matrix and training curves: <strong>not recorded</strong>.</p>
            <p className="text-mono-600">The current training script computes holdout classification results and confusion matrix when legally sourced datasets are supplied and training is run. A separate baseline experiment script is available, but no experiment comparison is claimed yet.</p>
          </div>
        </section>
        <section className="space-y-4" aria-labelledby="dataset">
          <h2 id="dataset" className="font-bold text-xl inline-flex items-center gap-2"><Database className="w-5 h-5"/> Dataset &amp; provenance</h2>
          <p className="text-sm text-mono-600">These are the <strong>dataset file paths expected by the existing training script</strong>, not proof that the source files or their licenses are present. The original source CSVs are excluded from the GitHub repository.</p>
          <div className="rounded-xl border border-mono-200 overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-mono-50 text-left"><tr><th className="p-3">Text class</th><th className="p-3">Expected input path</th><th className="p-3">Source/license</th></tr></thead>
              <tbody>{sources.map(([label,path])=><tr key={label} className="border-t border-mono-200"><th className="p-3 text-left font-medium">{label}</th><td className="p-3 font-mono text-xs">{path}</td><td className="p-3 text-mono-600">Not verified</td></tr>)}</tbody>
            </table>
          </div>
          <p className="text-xs text-mono-600">Per-class distribution and usage permissions: <strong>pending verification</strong>. Do not reuse, republish, or retrain on those files until permission, provenance and appropriate handling of sensitive material have been established.</p>
        </section>
        <section className="space-y-4" aria-labelledby="method">
          <h2 id="method" className="font-bold text-xl">Model architecture &amp; methodology</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Info label="Architecture" value="Embedding → Bidirectional LSTM → Dropout → Dense → Softmax" />
            <Info label="Vocabulary / context" value="15,000 tokens / 100-token maximum sequence" />
            <Info label="Embedding / recurrent units" value="64 dimensions / 64 LSTM units per direction" />
            <Info label="Output" value="8 research text categories (not diagnoses)" />
          </div>
          <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed text-mono-700">
            <li>Inspect and permission-check original data; remove duplicate and cross-label conflicting samples.</li>
            <li>Preprocess text; split examples by source/person where feasible to prevent data leakage.</li>
            <li>Fit tokenizer using training split only; pad or truncate to a consistent sequence length.</li>
            <li>Train Bi-LSTM and an ordinary LSTM baseline with the same held-out split and settings.</li>
            <li>Report held-out accuracy, macro-F1, class-wise metrics, and confusion matrix only from an executed experiment.</li>
          </ol>
          <p className="text-xs text-mono-600">Steps 2–5 describe the <strong>reproducible scripts / planned experiments</strong>, not a claim that the checked-in historical model used that exact updated experimental design.</p>
        </section>
        <section className="rounded-xl border border-mono-300 bg-mono-50 p-5 space-y-2">
          <h2 className="font-bold inline-flex items-center gap-2"><ShieldAlert className="w-5 h-5"/> Responsible AI &amp; remaining work</h2>
          <p className="text-sm leading-relaxed">Bi-LSTM scores represent learned text patterns, not diagnoses or likelihood of having a condition. This project is not a therapy or emergency service. English/Indonesian robustness, representative testing, bias, privacy, and safety limitations require further independent review.</p>
          <p className="text-sm leading-relaxed"><strong>Before final submission:</strong> confirm dataset rights, execute and retain actual experiments, add the missing graphs and tables to the report, verify team attribution, and record the real web demo.</p>
        </section>
      </div>
    </main>
  );
}
function Metric({title,value}:{title:string,value:string}){
  return <div className="p-4 rounded-xl border border-mono-200 bg-mono-50 space-y-1"><div className="text-xs text-mono-600">{title}</div><div className="text-2xl font-bold tabular-nums">{value}</div></div>;
}
function Info({label,value}:{label:string,value:string}){
  return <div className="border border-mono-200 p-4 rounded-xl space-y-1"><div className="text-xs text-mono-500 uppercase tracking-wide">{label}</div><div>{value}</div></div>;
}
