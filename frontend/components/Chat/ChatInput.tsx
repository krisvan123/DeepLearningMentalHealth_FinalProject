import React, { useState, useRef, useEffect } from "react";
import { ArrowUp } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  disabled = false,
}) => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        140
      )}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading || disabled) return;

    onSendMessage(input.trim());
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full">
      {/* Processing is shown in the chat as an assistant typing bubble. */}

      <form
        onSubmit={handleSubmit}
        className="relative flex items-end gap-3 p-2 sm:p-2.5 bg-white border border-mono-300 rounded-2xl focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all shadow-sm"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Share what's on your mind..."
          rows={1}
          disabled={disabled || isLoading}
          className="w-full resize-none border-0 bg-transparent py-1.5 px-3 text-sm text-mono-900 placeholder:text-mono-400 focus:outline-none focus:ring-0 max-h-36 disabled:opacity-50 leading-relaxed"
          aria-label="User reflection input"
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading || disabled}
          className="flex-shrink-0 w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center hover:bg-mono-800 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
          aria-label="Send message"
        >
          <ArrowUp className="w-4 h-4 stroke-[2.5]" />
        </button>
      </form>

      <div className="text-center mt-2.5 text-[11px] text-mono-400">
        MindCare processes reflections through local Deep Learning classification.
      </div>
    </div>
  );
};
