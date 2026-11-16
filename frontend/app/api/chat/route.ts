import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({error:"browser_inference_only",
    message:"Use the MindCare website for on-device Transformer inference. The optional FastAPI backend exposes its own /api/chat endpoint."}, {status:410});
}
