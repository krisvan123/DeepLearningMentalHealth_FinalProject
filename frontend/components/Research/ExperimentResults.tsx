"use client";

import React, { useEffect, useState } from "react";

type ModelResult = {
  parameters: number;
  holdout: {
    accuracy: number;
    macro_f1: number;
    confusion_matrix: number[][];
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
      </div>
    ))}
  </div>;
}
