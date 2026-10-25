"use client";

import React, { useState, useEffect, useRef } from "react";
import { Menu } from "lucide-react";
import { Message, ModelStatus } from "@/lib/types";
import { getBrowserModelStatus, sendBrowserMessage } from "@/lib/browser-inference";
import { APP_NAME, APP_SUBTITLE } from "@/lib/config";
import { StatusIndicator } from "@/components/UI/StatusIndicator";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { ChatWindow } from "@/components/Chat/ChatWindow";
import { ChatInput } from "@/components/Chat/ChatInput";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  // A new conversation invalidates any previous asynchronous response.
  const conversationGeneration = useRef(0);
  const pendingRequest = useRef(false);

  // Fetch model health and configuration status on load and periodically
  useEffect(() => {
    async function checkStatus() {
      try {
        const status = await getBrowserModelStatus();
        setModelStatus(status);
      } catch {
        setModelStatus({
          status: "unavailable",
          model_ready: false,
          model_error: "Browser model could not load",
          architecture: "Bi-LSTM",
          task: "Multi-class Classification",
          num_classes: 8,
          classes: [],
          confidence_threshold: 0.35,
        });
      }
    }
    checkStatus();
    // Poll every 30 seconds for live status
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async (userText: string) => {
    if (!userText.trim() || pendingRequest.current) return;

    const text = userText.trim();
    const generation = conversationGeneration.current;
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const placeholderId = `asst-${token}`;
    const startedAt = performance.now();
    pendingRequest.current = true;
    setIsLoading(true);

    // Place the assistant bubble immediately, rather than waiting for inference.
    setMessages((previous) => [
      ...previous,
      {
        id: `user-${token}`, role: "user", content: text,
        timestamp: new Date().toISOString(),
      },
      {
        id: placeholderId, role: "assistant", content: "",
        timestamp: new Date().toISOString(), isTyping: true,
      },
    ]);

    try {
      const lastAssistant = [...messages]
        .reverse()
        .find((m) => m.role === "assistant" && !m.isTyping)?.content;
      const history = messages
        .filter((m) => !m.isTyping)
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
      const result = await sendBrowserMessage(text, lastAssistant, history);

      // A brief visual transition keeps instant template replies readable.
      // Urgent support replies are never deliberately delayed or animated.
      if (!result.is_high_risk && !result.safety_override) {
        const remaining = Math.max(0, 450 - (performance.now() - startedAt));
        if (remaining) await new Promise<void>((resolve) => setTimeout(resolve, remaining));
      }
      if (generation !== conversationGeneration.current) return;

      setMessages((previous) =>
        previous.map((message) => message.id === placeholderId
          ? {
              id: placeholderId,
              role: "assistant" as const,
              content: result.response,
              timestamp: new Date().toISOString(),
              predicted_class: result.predicted_class,
              confidence: result.confidence,
              is_high_risk: result.is_high_risk,
              is_ood: result.is_ood,
              latency_ms: result.latency_ms,
              probabilities: result.probabilities,
              response_source: result.response_source,
              support_topic: result.support_topic,
              isTyping: false,
              isRevealing: !result.is_high_risk && !result.safety_override,
            }
          : message
        )
      );
    } catch (err: unknown) {
      if (generation !== conversationGeneration.current) return;
      const errorMsg = err instanceof Error ? err.message : "Model unavailable";
      setMessages((previous) =>
        previous.map((message) => message.id === placeholderId
          ? {
              id: placeholderId,
              role: "assistant" as const,
              content: "I couldn't prepare a response right now. Please try again.",
              timestamp: new Date().toISOString(),
              error_detail: errorMsg,
              predicted_class: "Error",
              isTyping: false,
              isRevealing: false,
            }
          : message
        )
      );
    } finally {
      if (generation === conversationGeneration.current) {
        pendingRequest.current = false;
        setIsLoading(false);
      }
    }
  };

  const handleNewConversation = () => {
    conversationGeneration.current += 1;
    pendingRequest.current = false;
    setIsLoading(false);
    setMessages([]);
  };

  const currentStatus = modelStatus === null
    ? "connecting"
    : modelStatus.model_ready
    ? "ready"
    : modelStatus.status === "connecting"
    ? "connecting"
    : "unavailable";

  return (
    <div className="flex h-screen overflow-hidden bg-white text-mono-900 font-sans">
      {/* Sidebar Component */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewConversation={handleNewConversation}
        modelStatus={modelStatus}
        developerMode={developerMode}
        onToggleDeveloperMode={setDeveloperMode}
      />

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col h-full lg:pl-[300px] overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-5 sm:px-8 py-3.5 border-b border-mono-200 bg-white/95 backdrop-blur-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-mono-700 hover:text-black hover:bg-mono-100 lg:hidden"
              aria-label="Open sidebar menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-widest text-black uppercase">
                {APP_NAME}
              </h1>
              <p className="text-[11px] text-mono-500 font-normal">
                {APP_SUBTITLE}
              </p>
            </div>
          </div>

          <StatusIndicator status={currentStatus} />
        </header>

        {/* Scrollable Chat Area and Anchored Input */}
        <main className="flex-1 flex flex-col overflow-hidden w-full relative">
          <ChatWindow
            messages={messages}
            onSelectPrompt={handleSendMessage}
            developerMode={developerMode}
          />

          {/* Sticky Bottom Input Area */}
          <div className="border-t border-mono-200 bg-white/95 backdrop-blur-sm z-10 shrink-0">
            <div className="max-w-[850px] w-full mx-auto px-4 sm:px-8 py-3.5 sm:py-4">
              <ChatInput
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
