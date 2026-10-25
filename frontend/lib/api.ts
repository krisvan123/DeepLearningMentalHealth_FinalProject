import { ChatRequest, ChatResponse, ModelStatus, ChatTurn } from "./types";

/**
 * Send user message to the chat API route.
 */
export async function sendMessage(
  message: string,
  lastResponse?: string,
  history: ChatTurn[] = []
): Promise<ChatResponse> {
  const payload: ChatRequest = {
    message,
    last_response: lastResponse,
    history: history.slice(-8),
  };

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorDetail = "Something went wrong while processing your message. Please try again.";
    try {
      const errJson = await response.json();
      if (errJson.debug?.reason) {
        errorDetail = errJson.debug.reason;
      } else if (errJson.detail) {
        errorDetail = errJson.detail;
      } else if (errJson.error) {
        errorDetail = errJson.error;
      }
    } catch {
      // Keep default error message
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

/**
 * Fetch health & model status from API route.
 */
export async function getModelStatus(): Promise<ModelStatus> {
  const response = await fetch("/api/health", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to reach model service");
  }

  return response.json();
}
