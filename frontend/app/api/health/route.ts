import { NextResponse } from "next/server";
import spec from "@/lib/model-spec.json";
export async function GET() {
  return NextResponse.json({status:"browser_inference", model_ready:null, deployment_mode:"client",
    architecture:spec.architecture, task:"Multi-class Text Classification", num_classes:spec.classes.length,
    classes:spec.classes, confidence_threshold:spec.threshold,
    message:"Transformer readiness is determined by loading the trained ONNX checkpoint in your browser."});
}
