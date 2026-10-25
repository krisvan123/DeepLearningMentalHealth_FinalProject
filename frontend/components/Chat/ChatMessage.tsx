import React from "react";
import { Message } from "@/lib/types";
import { AlertTriangle, Clock, Server, Terminal } from "lucide-react";

interface ChatMessageProps {
  message: Message;
  developerMode?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  developerMode = false,
}) => {
  const isUser = message.role === "user";
  const isHighRisk = message.is_high_risk;

  if (isUser) {
    return (
      <div className="flex justify-end my-1 w-full">
        <div className="bg-black text-white px-5 py-3.5 rounded-2xl rounded-tr-sm max-w-[85%] sm:max-w-[70%] text-sm leading-relaxed shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  // High-Risk Suicide Crisis Protocol layout
  if (isHighRisk) {
    return (
      <div className="flex justify-start my-2 w-full">
        <div className="w-full max-w-[95%] sm:max-w-[80%] border-2 border-black rounded-2xl p-5 bg-white space-y-3 shadow-sm">
          <div className="flex items-center gap-2 pb-2 border-b border-mono-200 text-xs font-bold uppercase tracking-wider text-black">
            <AlertTriangle className="w-4 h-4 text-black" />
            <span>Crisis Support Protocol</span>
          </div>

          <div className="text-sm text-mono-900 leading-relaxed whitespace-pre-line font-medium">
            {message.content}
          </div>

          <div className="bg-mono-100 rounded-lg p-3 text-xs text-mono-800 space-y-1 border border-mono-200">
            <div className="font-semibold text-black uppercase tracking-wide">
              Immediate Confidential Resources
            </div>
            <div>• US &amp; Canada: Call or text <b className="text-black">988</b> (24/7 Lifeline)</div>
            <div>• Indonesia: Hubungi <b className="text-black">119 ext. 8</b> (Healing119.id)</div>
            <div>• Global: Visit <b className="text-black">findahelpline.com</b></div>
          </div>

          {developerMode && <DeveloperCard message={message} />}
        </div>
      </div>
    );
  }

  // Standard Assistant Response layout
  return (
    <div className="flex justify-start my-1 w-full">
      <div className="w-full max-w-[95%] sm:max-w-[78%] space-y-2.5">
        <div className="bg-white text-mono-900 border border-mono-200 px-5 py-4 rounded-2xl rounded-tl-sm text-sm leading-relaxed shadow-sm whitespace-pre-line">
          {message.content}
        </div>

        {developerMode && <DeveloperCard message={message} />}
      </div>
    </div>
  );
};

const DeveloperCard: React.FC<{ message: Message }> = ({ message }) => {
  return (
    <div className="rounded-xl border border-dashed border-mono-300 bg-mono-50 p-3.5 text-xs font-mono text-mono-700 space-y-2">
      <div className="flex justify-between items-center text-mono-500 font-semibold border-b border-mono-200 pb-1.5">
        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
          <Terminal className="w-3 h-3" />
          Developer Inspection
        </span>
        <span className="flex items-center gap-1 text-[11px]">
          <Clock className="w-3 h-3" />
          {message.latency_ms !== undefined ? `${message.latency_ms.toFixed(1)} ms` : "N/A"}
        </span>
      </div>

      {message.error_detail && (
        <div className="bg-mono-200/60 p-2 rounded text-[11px] text-black">
          <span className="font-bold">Error Trace: </span>
          <span>{message.error_detail}</span>
        </div>
      )}

      {message.predicted_class && (
        <div className="flex justify-between items-center">
          <span className="text-mono-500">Predicted Class:</span>
          <span className="font-bold text-mono-900">
            {message.predicted_class}
            {message.is_ood && " (OOD Fallback)"}
          </span>
        </div>
      )}

      {message.confidence !== undefined && (
        <div className="flex justify-between items-center">
          <span className="text-mono-500">Confidence Score:</span>
          <span className="font-semibold text-mono-800">
            {(message.confidence * 100).toFixed(1)}% ({message.confidence.toFixed(4)})
          </span>
        </div>
      )}

      {message.probabilities && (
        <div className="pt-1.5 space-y-1">
          <div className="text-[11px] text-mono-500 font-sans">Probability Breakdown:</div>
          <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
            {Object.entries(message.probabilities)
              .sort(([, a], [, b]) => b - a)
              .map(([cls, prob]) => (
                <div key={cls} className="text-[11px] flex justify-between items-center">
                  <span>{cls}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-mono-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-black rounded-full"
                        style={{ width: `${Math.min(100, prob * 100)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right">{(prob * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
