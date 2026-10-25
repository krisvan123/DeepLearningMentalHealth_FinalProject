/**
 * Type definitions for MindCare Next.js Application.
 */

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  predicted_class?: string;
  confidence?: number;
  is_high_risk?: boolean;
  is_ood?: boolean;
  latency_ms?: number;
  probabilities?: Record<string, number>;
  error_detail?: string;
  /** True while MindCare is preparing the response. */
  isTyping?: boolean;
  /** Animate a completed, non-critical response inside the chat bubble. */
  isRevealing?: boolean;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}
export interface ChatRequest {
  message: string;
  last_response?: string;
  history?: ChatTurn[];
}

export interface ChatResponse {
  response: string;
  predicted_class?: string;
  confidence?: number;
  is_high_risk?: boolean;
  is_ood?: boolean;
  latency_ms?: number;
  probabilities?: Record<string, number>;
  safety_override?: boolean;
  status?: string;
  error?: string;
}

export interface ModelStatus {
  status: "ready" | "connecting" | "unavailable";
  model_ready: boolean;
  model_error?: string | null;
  architecture: string;
  task: string;
  num_classes: number;
  classes: string[];
  confidence_threshold: number;
}

export interface AppConfig {
  appName: string;
  appSubtitle: string;
  quickPrompts: string[];
}
