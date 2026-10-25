import { NextResponse } from "next/server";

/**
 * API classification is disabled on Vercel because the original HDF5 model
 * now runs in the visitor's browser with TensorFlow.js.
 * Do not proxy private reflections to an obsolete LocalTunnel endpoint.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "browser_inference_only",
      message: "MindCare now performs inference on the device. Open the MindCare website and use the chat interface; /api/chat is no longer an inference endpoint.",
    },
    { status: 410 }
  );
}
