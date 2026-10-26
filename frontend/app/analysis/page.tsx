"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Activity, Loader2, Play, ShieldCheck } from "lucide-react";
import { analyzeTextWithModel, type ResearchPrediction } from "@/lib/browser-inference";

const examples = [
  "I feel nervous before a school presentation.",
  "I had a normal day and visited the library.",
  "Hello, how are you?",
];

export default function AnalysisPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ResearchPrediction | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function analyze(event: React.FormEvent) {
    event.preventDefault();
    if (loading || !input.trim()) return;
    setLoading(true); setResult(null); setError("");
    try {
      setResult(await analyzeTextWithModel(input.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run the model. Try again.");
    } finally { setLoading(false); }
  }
  return (
    <main className="min-h-[100dvh] bg-white text-mono-900">
      <div className="mx-auto max-w-5xl px-4 sm:px-8 py-8 sm:py-12 space-y-9">
        <nav className="flex items-center justify-between gap-3 text-sm" aria-label="Research navigation">
          <Link href="/" className="inline-flex items-center gap-2 text-mono-600 hover:text-black"><ArrowLeft className="w-4 h-4" /> Back to MindCare</Link>
          <Link href="/research" className="underline underline-offset-4 font-semibold">Dataset &amp; results</Link>
        </nav>
        <header className="space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-mono-500"><Activity className="w-4 h-4" /> Deep Learning Laboratory</div>
          <h1 className="font-bold text-3xl sm:text-4xl tracking-tight">Model Analysis</h1>
          <p className="text-mono-600 leading-relaxed">Test the exported <strong>8-class Bi-LSTM</strong> directly in your browser. Unlike the chat page, this laboratory always calls the neural network: no greeting or response rules can replace the prediction.</p>
        </header>
        <form onSubmit={analyze} className="rounded-2xl border border-mono-200 shadow-sm p-4 sm:p-6 space-y-4">
          <label htmlFor="analysis-input" className="block font-semibold text-sm">Text to classify (research only)</label>
          <textarea id="analysis-input" value={input} onChange={event => {setInput(event.target.value);setResult(null);}} maxLength={2000} rows={4}
            placeholder="Write a sample sentence…" className="w-full rounded-xl border border-mono-300 px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-mono-700" />
          <div className="flex gap-2 flex-wrap" aria-label="Test sample sentences">
            {examples.map((example,index)=><button type="button" key={index} onClick={()=>{setInput(example);setResult(null);}}
              className="rounded-full border border-mono-200 bg-mono-50 text-mono-600 px-3 py-1.5 text-xs hover:border-mono-500">Example {index+1}</button>)}
          </div>
          <button type="submit" disabled={!input.trim()||loading}
            className="inline-flex items-center gap-2 rounded-xl bg-mono-900 text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-40">
            {loading?<Loader2 className="w-4 h-4 animate-spin"/>:<Play className="w-4 h-4"/>}
            {loading?"Running on-device inference…":"Run Bi-LSTM"}
          </button>
          <p className="text-xs text-mono-500">Model weights are downloaded as static files and inference runs on your device. Do not enter identifying or sensitive personal details for a classroom demonstration.</p>
        </form>
        <section aria-live="polite" className="space-y-5">
          {error && <div role="alert" className="rounded-xl border border-mono-300 bg-mono-50 p-4 text-sm">Model unavailable: {error}. Confirm that the model assets have been deployed and reload the page.</div>}
          {result && (
            <div className="rounded-2xl border border-mono-200 p-4 sm:p-6 space-y-5">
              <div className="flex flex-wrap gap-3 justify-between items-start">
                <div className="space-y-1">
                  <p className="text-xs text-mono-500 uppercase tracking-wide">Top predicted text category</p>
                  <h2 className="font-semibold text-2xl">{result.predictedClass}</h2>
                  <p className="text-sm text-mono-600">Maximum softmax score: {(result.topScore*100).toFixed(1)}% {result.belowThreshold?"(below configured threshold)":""}</p>
                </div>
                <span className="text-xs rounded-full border border-mono-200 p-2">{result.latencyMs.toFixed(0)} ms inference</span>
              </div>
              <h3 className="font-semibold text-sm">Eight model output scores</h3>
              <div className="space-y-3">
                {result.scores.map(item=>(
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm gap-4">
                      <span>{item.label}</span><span className="tabular-nums text-mono-700">{(item.score*100).toFixed(2)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-mono-100 overflow-hidden">
                      <div style={{width:`${Math.max(0,Math.min(100,item.score*100))}%`}} className="bg-mono-800 h-full rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-mono-500">Scores are uncalibrated model outputs on text classes. They are <strong>not</strong> percentages of having a health condition, clinical confidence, or proof of individual safety. The model was not independently evaluated for clinical use or Indonesian-language performance.</p>
            </div>
          )}
        </section>
        <footer className="border-t border-mono-200 pt-5 flex gap-2 text-xs text-mono-500"><ShieldCheck className="w-4 h-4 shrink-0" /> For coursework demonstrations only — not a medical assessment or a substitute for professional help.</footer>
      </div>
    </main>
  );
}
