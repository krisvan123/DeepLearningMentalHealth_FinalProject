import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, last_response, history } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message cannot be empty." },
        { status: 400 }
      );
    }

    if (message.length > 4000) {
      return NextResponse.json(
        { error: "Message exceeds 4000 characters limit." },
        { status: 400 }
      );
    }

    // Backend inference URL from environment variables
    const backendUrl =
      process.env.MODEL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://127.0.0.1:8000";

    try {
      const backendResponse = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Bypass-Tunnel-Reminder": "true",
        },
        body: JSON.stringify({
          message: message.trim(),
          last_response: last_response,
          history: Array.isArray(history)
            ? history.slice(-8).filter((item: unknown) => {
                if (!item || typeof item !== "object") return false;
                const turn = item as Record<string, unknown>;
                return (turn.role === "user" || turn.role === "assistant")
                  && typeof turn.content === "string" && turn.content.length <= 1000;
              })
            : [],
        }),
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json().catch(() => null);
        const detail = errorData?.detail || "Inference server error";
        return NextResponse.json({ error: detail }, { status: backendResponse.status });
      }

      const data = await backendResponse.json();
      return NextResponse.json(data);
    } catch (networkError) {
      // Backend server is unreachable (e.g. Python service offline)
      console.warn("Backend inference API unreachable at", backendUrl, networkError);
      return NextResponse.json(
        {
          error: "Something went wrong while processing your message. Please try again.",
          debug: {
            status: 503,
            reason: "Inference service temporarily unavailable.",
          },
        },
        { status: 503 }
      );
    }
  } catch (err: unknown) {
    console.error("Unhandled API route error:", err);
    return NextResponse.json(
      { error: "Something went wrong while processing your message." },
      { status: 500 }
    );
  }
}
