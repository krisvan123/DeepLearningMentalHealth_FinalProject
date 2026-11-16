"""Optional FastAPI backend using the same trained Transformer as the browser."""
import os
from typing import Literal
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from config.config import MODEL_PATH, TOKENIZER_PATH
from model.model_config import ModelConfig
from model.model_loader import load_model, load_tokenizer
from model.predictor import Predictor
from response.response_manager import ResponseManager, INDONESIAN_MARKERS
from utils.safety import needs_crisis_support
from utils.intent_router import infer_simple_indonesian_theme

app = FastAPI(title="MindCare Transformer API", version="2.0.0")
app.add_middleware(CORSMiddleware,
    allow_origins=[s.strip() for s in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if s.strip() and "*" not in s],
    allow_methods=["GET", "POST"], allow_headers=["Content-Type"], allow_credentials=False)
_model_config = ModelConfig()
_model, _model_err = load_model(MODEL_PATH)
_tokenizer, _tok_err = load_tokenizer(TOKENIZER_PATH)
_predictor = Predictor(_model, _tokenizer, _model_config)
_responses = ResponseManager()


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class AnalyzeRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class ChatRequest(AnalyzeRequest):
    last_response: str | None = Field(default=None, max_length=8000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=8)


class ChatResponse(BaseModel):
    response: str
    response_source: Literal["model", "safety", "support", "clarify", "social"]
    predicted_class: str | None = None
    confidence: float | None = None
    probabilities: dict[str, float] | None = None
    is_high_risk: bool = False
    is_ood: bool = False
    safety_override: bool = False
    latency_ms: float | None = None


def validated(text):
    if not text.strip():
        raise HTTPException(status_code=400, detail="Message must not be blank")
    return text.strip()


@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "ready" if _predictor.is_ready else "unavailable", "model_ready": _predictor.is_ready,
            "model_error": _model_err or _tok_err, **_model_config.to_dict(), "classes": _model_config.class_labels}


@app.post("/api/analyze")
def analyze(payload: AnalyzeRequest):
    message = validated(payload.message)
    if not _predictor.is_ready:
        raise HTTPException(status_code=503, detail="Transformer is unavailable")
    return _predictor.predict(message)


@app.post("/api/chat", response_model=ChatResponse)
@app.post("/predict", response_model=ChatResponse)
def chat_endpoint(payload: ChatRequest):
    message = validated(payload.message)
    previous = next((turn.content for turn in reversed(payload.history) if turn.role == "user"), None)
    if needs_crisis_support(message):
        response = _responses.get_response("Suicide", user_message=message)
        return ChatResponse(response=response["text"], response_source="safety", is_high_risk=True, safety_override=True)
    # English-trained model cannot substantiate Indonesian health-category scores.
    if INDONESIAN_MARKERS.search(message):
        theme = infer_simple_indonesian_theme(message) or "Neutral"
        response = _responses.get_response(theme, user_message=message, previous_user_message=previous)
        return ChatResponse(response=response["text"], response_source="support")
    if not _predictor.is_ready:
        raise HTTPException(status_code=503, detail="Transformer is unavailable")
    prediction = _predictor.predict(message)  # Never put history before the newest message.
    label = prediction["predicted_class"]
    if prediction["below_threshold"] or label == "Suicidal":
        return ChatResponse(response="I'd like to understand without making assumptions. What has been weighing on you? If you feel unsafe right now, contact local emergency services or someone you trust.",
                            response_source="clarify", latency_ms=prediction["latency_ms"])
    response = _responses.get_response("Neutral" if label == "Normal" else label,
                                      user_message=message, previous_user_message=previous,
                                      last_response_text=payload.last_response)
    return ChatResponse(response=response["text"], response_source="model", predicted_class=label,
                        confidence=prediction["confidence"], probabilities=prediction["probabilities"],
                        latency_ms=prediction["latency_ms"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.server:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
