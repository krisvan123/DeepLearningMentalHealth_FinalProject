import React from "react";
import { ModelStatus as ModelStatusType } from "@/lib/types";

interface ModelStatusProps {
  status: ModelStatusType | null;
  loading?: boolean;
}

export const ModelStatus: React.FC<ModelStatusProps> = ({ status }) => {
  const archDisplay = status?.architecture?.includes("Bi-LSTM")
    ? "Bi-LSTM"
    : status?.architecture || "Bi-LSTM";

  const taskDisplay = status?.task?.includes("Multi-class")
    ? "Multi-class"
    : status?.task || "Multi-class";

  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-baseline text-xs pb-1.5 border-b border-mono-200">
        <span className="text-mono-500">Architecture</span>
        <span className="font-semibold text-mono-900 text-right">{archDisplay}</span>
      </div>
      <div className="flex justify-between items-baseline text-xs pb-1.5 border-b border-mono-200">
        <span className="text-mono-500">Task</span>
        <span className="font-semibold text-mono-900 text-right">{taskDisplay}</span>
      </div>
      <div className="flex justify-between items-baseline text-xs pb-1.5 border-b border-mono-200">
        <span className="text-mono-500">Classes</span>
        <span className="font-semibold text-mono-900 text-right">
          {status?.num_classes || 8} Categories
        </span>
      </div>
      <div className="flex justify-between items-baseline text-xs pb-1.5 border-b border-mono-200">
        <span className="text-mono-500">Inference</span>
        <span className="font-semibold text-mono-900 text-right">
          {status?.model_ready ? "On-device TensorFlow.js" : "Model not loaded"}
        </span>
      </div>
      <div className="flex justify-between items-baseline text-xs pb-1.5 border-b border-mono-200">
        <span className="text-mono-500">OOD Threshold</span>
        <span className="font-semibold text-mono-900 text-right">
          {status?.confidence_threshold
            ? `${(status.confidence_threshold * 100).toFixed(0)}%`
            : "35%"}
        </span>
      </div>
    </div>
  );
};
