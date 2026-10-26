import React from "react";
import { Plus, X, Cpu, Info, Shield, Code } from "lucide-react";
import { Button } from "../UI/Button";
import { ModelStatus } from "./ModelStatus";
import { SafetyNotice } from "./SafetyNotice";
import { ModelStatus as ModelStatusType } from "@/lib/types";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/config";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNewConversation: () => void;
  modelStatus: ModelStatusType | null;
  developerMode: boolean;
  onToggleDeveloperMode: (enabled: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onNewConversation,
  modelStatus,
  developerMode,
  onToggleDeveloperMode,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-[300px] bg-mono-50 border-r border-mono-200 p-6 flex flex-col justify-between transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-6 overflow-y-auto pr-1">
          {/* Header & Mobile Close */}
          <div className="flex items-center justify-between pb-3 border-b border-mono-200">
            <div>
              <h2 className="text-base font-bold tracking-widest text-black uppercase">
                {APP_NAME}
              </h2>
              <p className="text-[11px] text-mono-500 tracking-wide uppercase">
                Classification System
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-mono-600 hover:text-black hover:bg-mono-200 lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Conversation Button */}
          <div>
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                onNewConversation();
                onClose();
              }}
              className="gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New conversation</span>
            </Button>
          </div>

          {/* About Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-mono-600 uppercase tracking-wider">
              <Info className="w-3.5 h-3.5" />
              <span>About MindCare</span>
            </div>
            <p className="text-xs text-mono-700 leading-relaxed">
              {APP_DESCRIPTION}
            </p>
          </div>

          {/* Model Information */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-mono-600 uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5" />
              <span>Model Specifications</span>
            </div>
            <ModelStatus status={modelStatus} />
          </div>

          {/* Developer Mode Toggle */}
          <div className="space-y-2 pt-2 border-t border-mono-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-mono-600 uppercase tracking-wider">
                <Code className="w-3.5 h-3.5" />
                <span>Developer Mode</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={developerMode}
                  onChange={(e) => onToggleDeveloperMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-mono-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-mono-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-black"></div>
              </label>
            </div>
            <p className="text-[11px] text-mono-500">
              Show research category scores and inference details. Scores are not a diagnosis.
            </p>
          </div>

          {/* Safety Notice */}
          <div className="pt-2">
            <SafetyNotice />
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-mono-200 text-[11px] text-mono-400 text-center">
          Academic Deep Learning Prototype
        </div>
      </aside>
    </>
  );
};
