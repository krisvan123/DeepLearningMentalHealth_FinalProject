import React from "react";
import { AlertCircle } from "lucide-react";

export const SafetyNotice: React.FC = () => {
  return (
    <div className="rounded-lg border border-mono-200 bg-mono-50 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-mono-900 uppercase tracking-wide">
        <AlertCircle className="w-3.5 h-3.5 text-mono-700" />
        <span>Research Prototype</span>
      </div>
      <p className="text-xs text-mono-600 leading-relaxed">
        This application is an academic/research prototype and is not a substitute for professional mental-health care or emergency services.
      </p>
      <div className="pt-1 text-[11px] text-mono-500 border-t border-mono-200">
        If you are unsafe right now, contact local emergency services or a trusted adult. Psychological support: <span className="font-semibold text-mono-800">119 ext. 8</span> (Healing119.id / Indonesia) or <span className="font-semibold text-mono-800">988</span> (US/Canada).
      </div>
    </div>
  );
};
