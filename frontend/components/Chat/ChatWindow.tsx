import React, { useRef, useEffect } from "react";
import { Message } from "@/lib/types";
import { ChatMessage } from "./ChatMessage";
import { EmptyState } from "./EmptyState";

interface ChatWindowProps {
  messages: Message[];
  onSelectPrompt: (prompt: string) => void;
  developerMode?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onSelectPrompt,
  developerMode = false,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll only the chat pane. scrollIntoView() can scroll the page
    // itself and push the input composer offscreen on mobile browsers.
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollTo({ top: scroller.scrollHeight, behavior: "auto" });
  }, [messages]);

  // When the assistant gradually reveals text, the bubble grows without
  // changing the messages array. Follow that growth only if the user is near
  // the bottom; never pull them away from earlier messages they're reading.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const conversation = conversationRef.current;
    if (!scroller || !conversation || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
      if (distance <= 140) scroller.scrollTo({ top: scroller.scrollHeight, behavior: "auto" });
    });
    observer.observe(conversation);
    return () => observer.disconnect();
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
        <EmptyState onSelectPrompt={onSelectPrompt} />
      </div>
    );
  }

  return (
    <div ref={scrollerRef} className="flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain px-4 sm:px-8 py-4 sm:py-6">
      <div ref={conversationRef} className="max-w-[850px] w-full mx-auto space-y-5 sm:space-y-6">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            developerMode={developerMode}
          />
        ))}
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
};
