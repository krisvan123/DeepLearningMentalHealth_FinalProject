import React from "react";
import { BookOpen, ExternalLink } from "lucide-react";

/** Official resources. Advice is not a substitute for personalized care. */
export const SupportResources: React.FC = () => (
  <details className="rounded-lg border border-mono-200 bg-white p-3 group">
    <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-mono-900">
      <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
      Practical help &amp; trusted resources
    </summary>
    <div className="mt-3 space-y-3 text-[11px] leading-relaxed text-mono-700">
      <p>
        If difficult feelings persist, affect school or daily life, or you want
        help finding support, consider a trusted adult, counselor, psychologist,
        or healthcare professional.
      </p>
      <a href="https://www.who.int/publications/i/item/9789240003927"
        target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 underline underline-offset-2 hover:text-black">
        WHO — Practical stress-management guide
        <ExternalLink className="w-3 h-3" aria-hidden="true" />
      </a>
      <a href="https://www.healing119.id/"
        target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 underline underline-offset-2 hover:text-black">
        Indonesia — Healing119 psychological support
        <ExternalLink className="w-3 h-3" aria-hidden="true" />
      </a>
      <p className="border-t border-mono-200 pt-2">
        <strong>Privacy:</strong> MindCare computes the classifier locally in your
        browser. Your messages are not sent to an external model API. Starting a
        new conversation clears the conversation shown on this page.
      </p>
    </div>
  </details>
);
