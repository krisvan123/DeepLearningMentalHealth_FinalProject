import { NextResponse } from "next/server";

/**
 * The model is no longer served by a Python server.
 * This endpoint cannot claim readiness of a user's browser; the actual
 * status is determined by loading the TFJS model in the client.
 */
export async function GET() {
  return NextResponse.json({
    status: "browser_inference",
    model_ready: null,
    deployment_mode: "client",
    model_error: null,
    architecture: "Bi-LSTM (TensorFlow.js)",
    task: "Multi-class Text Classification",
    num_classes: 8,
    classes: ["Addiction", "Anxiety", "Depression", "Eating Disorder", "Suicide", "Neutral", "OOD", "Greeting"],
    confidence_threshold: 0.35,
    message: "MindCare loads its trained model directly in each visitor's browser. Readiness is shown in the website UI, not this server endpoint.",
  });
}
