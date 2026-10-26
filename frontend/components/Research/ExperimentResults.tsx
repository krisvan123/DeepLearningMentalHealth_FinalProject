"use client";

import React, { useEffect, useState } from "react";

type ModelResult = {
  parameters: number;
  holdout: {
    accuracy: number;
    macro_f1: number;
    confusion_matrix: number[][];
    per_class?: Record<string,{precision:number;recall:number;"f1-score":number;support:number}>;
  };
  training_history: Record<string, number[]>;
};
type Evidence = {
  class_labels: string[];
  generated_at: string;
  models: { LSTM_baseline: ModelResult; BiLSTM: ModelResult };
  samples: { train:number; validation:number; test:number };
};

function Row({title,model}:{title:string;model:ModelResult}) {
  return <div className="border border-mono-200 rounded-xl p-4 space-y-2">
    <h3 className="font-semibold">{title}</h3>
    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
      <div><dt className="text-xs text-mono-500">Parameters</dt><dd>{model.parameters.toLocaleString()}</dd></div>
      <div><dt className="text-xs text-mono-500">Held-out accuracy</dt><dd>{(model.holdout.accuracy*100).toFixed(2)}%</dd></div>
      <div><dt className="text-xs text-mono-500">Held-out macro-F1</dt><dd>{model.holdout.macro_f1.toFixed(3)}</dd></div>
    </dl>
  </div>;
}


function LearningCurve({history,metric}:{history:Record<string,number[]>;metric:"accuracy"|"loss"}) {
  const training=history[metric] || [],validation=history["val_"+metric]||[];
  if (!training.length || !validation.length) return <p className="text-xs text-mono-500">No authentic training history available.</p>;
  const values=[...training,...validation].filter(Number.isFinite);
  const low=metric==="accuracy"?0:Math.min(...values);
  const high=metric==="accuracy"?1:Math.max(...values);
  const range=high-low||1;
  const point=(data:number[])=>(data.map((value,i)=>{
    const x=24+(i/(Math.max(data.length-1,1)))*342;
    const y=132-((value-low)/range)*110;
    return x.toFixed(1)+","+y.toFixed(1);
  }).join(" "));
  return <figure className="border border-mono-200 rounded-xl p-3 space-y-2">
    <figcaption className="text-xs font-semibold">{metric==="accuracy"?"Training/validation accuracy":"Training/validation loss"}</figcaption>
    <svg viewBox="0 0 390 154" role="img" aria-label={"Actual "+metric+" history: train (solid) and validation (dashed)"} className="w-full">
      <line x1="24" x2="366" y1="132" y2="132" stroke="#a3a3a3"/>
      <line x1="24" x2="24" y1="22" y2="132" stroke="#a3a3a3"/>
      <polyline points={point(training)} fill="none" stroke="#171717" strokeWidth="2.5"/>
      <polyline points={point(validation)} fill="none" stroke="#737373" strokeWidth="2.5" strokeDasharray="6 4"/>
      <text x="26" y="15" fontSize="10" fill="#525252">{high.toFixed(2)}</text>
      <text x="26" y="146" fontSize="10" fill="#525252">{low.toFixed(2)}</text>
      <text x="280" y="146" fontSize="10" fill="#525252">epochs</text>
    </svg>
    <p className="text-[11px] text-mono-600">Solid: training · Dashed: validation · values from executed experiment file</p>
  </figure>;
}

export function ExperimentResults(){
  const [evidence,setEvidence]=useState<Evidence|null>(null);
  const [state,setState]=useState<"loading"|"missing"|"ready">("loading");
  useEffect(()=>{
    let canceled=false;
    fetch("/research/model_comparison.json",{cache:"no-store"}).then(async response=>{
      if(!response.ok)throw new Error("Unavailable");
      const data=await response.json() as Evidence;
      if(!data?.models?.LSTM_baseline?.holdout ||
         !data?.models?.BiLSTM?.holdout || !Array.isArray(data.class_labels) ||
         data.class_labels.length!==8) throw new Error("Incomplete");
      if(!canceled){setEvidence(data);setState("ready");}
    }).catch(()=>{if(!canceled)setState("missing");});
    return ()=>{canceled=true;};
  },[]);
  if(state!=="ready" || !evidence){
    return <div className="border border-mono-200 rounded-xl p-4 text-sm text-mono-600">
      {state==="loading"?"Checking published experiment evidence…":
        "Baseline-vs-Bi-LSTM holdout comparison is not yet published. Verified dataset permissions and a real executed experiment are required."}
    </div>;
  }
  const models:[string,ModelResult][]=[
    ["Unidirectional LSTM",evidence.models.LSTM_baseline],
    ["Bidirectional LSTM",evidence.models.BiLSTM]
  ];
  return <div className="space-y-4">
    <p className="text-xs text-mono-600">Actual experiment file generated {new Date(evidence.generated_at).toLocaleDateString()}; train/validation/test: {evidence.samples.train}/{evidence.samples.validation}/{evidence.samples.test}. These results are research classification metrics, never a clinical validation.</p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {models.map(([name,model])=><Row key={name} title={name} model={model}/>)}
    </div>
    {models.map(([name,model])=>(
      <div key={name} className="overflow-x-auto border border-mono-200 p-3 sm:p-5 rounded-xl space-y-3">
        <h3 className="text-sm font-semibold">{name} — held-out confusion matrix</h3>
        <table className="border-collapse text-[10px] sm:text-xs w-full min-w-[600px]">
          <caption className="text-xs text-mono-500 pb-2 text-left">Rows: actual class; columns: predicted class; cell values are counts.</caption>
          <thead><tr><th className="p-1">Actual / Pred</th>{evidence.class_labels.map(label=><th key={label} className="p-1 font-medium">{label}</th>)}</tr></thead>
          <tbody>{evidence.class_labels.map((actual,i)=>(
            <tr key={actual}><th className="text-left p-1 font-medium">{actual}</th>
              {evidence.class_labels.map((label,j)=>{
                const v=Number(model.holdout.confusion_matrix[i]?.[j]??0);
                return <td key={label} className="text-center p-1 tabular-nums" style={{backgroundColor:i===j?"#e5e5e5":"#fafafa"}}>{v}</td>;
              })}
            </tr>
          ))}</tbody>
        </table>
        {model.holdout.per_class && (
          <div className="overflow-x-auto space-y-2">
            <h4 className="text-sm font-semibold">Per-class held-out metrics</h4>
            <table className="w-full min-w-[540px] text-xs">
              <thead><tr><th className="text-left p-1">Class</th><th>Precision</th><th>Recall</th><th>F1</th><th>Support</th></tr></thead>
              <tbody>{evidence.class_labels.map(label=>{
                const m=model.holdout.per_class?.[label];
                return <tr key={label} className="border-t border-mono-200">
                  <th className="text-left p-1">{label}</th>
                  <td className="text-center">{m?.precision?.toFixed(3)??"—"}</td>
                  <td className="text-center">{m?.recall?.toFixed(3)??"—"}</td>
                  <td className="text-center">{m?.["f1-score"]?.toFixed(3)??"—"}</td>
                  <td className="text-center">{m?.support??"—"}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <LearningCurve history={model.training_history} metric="accuracy"/>
          <LearningCurve history={model.training_history} metric="loss"/>
        </div>
      </div>
    ))}
  </div>;
}
