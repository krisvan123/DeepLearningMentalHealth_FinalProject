"""Context-aware selection of controlled response templates."""
import hashlib
import re
from typing import Any, Dict, List, Optional

from config.config import HIGH_RISK_CLASSES
from response.response_loader import ResponseLoader
from utils.logging_utils import get_logger

logger = get_logger(__name__)
SAFE_FALLBACK_RESPONSE = (
    "Thank you for sharing. I may not have understood that correctly. "
    "Would you like to tell me a little more about what you mean?"
)

INDONESIAN_RESPONSES = {
    "Greeting": "Halo! Kamu bisa cerita tentang hal yang sedang kamu pikirkan atau rasakan. Aku akan mencoba membantu menata ceritanya.",
    "Neutral": "Terima kasih sudah bercerita. Ada bagian dari pengalaman itu yang ingin kamu bahas lebih lanjut?",
    "Anxiety": "Sepertinya situasi ini membuatmu khawatir. Kita bisa membahasnya pelan-pelan. Bagian mana yang paling mengganggu pikiranmu sekarang?",
    "Depression": "Terima kasih sudah terbuka. Kedengarannya akhir-akhir ini terasa berat. Kamu boleh mulai dari hal yang paling ingin kamu ceritakan.",
    "Eating Disorder": "Perasaan seputar makanan dan tubuh layak ditanggapi tanpa menghakimi. Jika ini mengganggu keseharianmu, tenaga kesehatan atau konselor bisa membantu. Apa yang ingin kamu ceritakan lebih dulu?",
    "Addiction": "Terima kasih sudah jujur tentang kebiasaan yang sedang sulit kamu kendalikan. Kamu bisa mencari dukungan dari tenaga profesional atau orang yang kamu percaya. Apa yang paling sulit akhir-akhir ini?",
    "OOD": "Aku terutama dirancang untuk membantu percakapan tentang perasaan dan kesejahteraan emosional. Kalau mau, kamu bisa cerita tentang hal yang sedang kamu rasakan.",
    "Suicide": "Aku mendengar kamu sedang menghadapi situasi yang sangat berat. Kalau saat ini kamu merasa tidak aman, segera hubungi layanan darurat setempat atau orang dewasa tepercaya yang dapat mendampingimu secara langsung. Kamu layak mendapat bantuan.",
}
TOPIC_PATTERNS = (
    (re.compile(r"\b(exam|class|school|college|university|study|homework|ujian|kuliah|sekolah|kampus|tugas|belajar)\b", re.I), "studies", "kuliah atau sekolah"),
    (re.compile(r"\b(family|parent|mother|father|keluarga|orang\s*tua|ayah|ibu)\b", re.I), "family", "keluarga"),
    (re.compile(r"\b(job|office|work|boss|pekerjaan|kerja|kantor|atasan)\b", re.I), "work", "pekerjaan"),
    (re.compile(r"\b(friend|friends|relationship|teman|sahabat|pertemanan)\b", re.I), "relationships", "hubungan dengan orang lain"),
)
INDONESIAN_MARKERS = re.compile(
    r"\b(aku|saya|gue|gw|kamu|lagi|banget|nggak|enggak|gak|kuliah|tugas|takut|sedih|capek|halo|hai|cemas|pikiran|kenapa)\b", re.I
)

class ResponseManager:
    """Select responses using class, topic, language and recent context."""

    def __init__(self, loader: Optional[ResponseLoader] = None):
        self.loader = loader or ResponseLoader()

    def get_response(
        self, predicted_class: str, confidence: Optional[float] = None,
        last_response_text: Optional[str] = None, user_message: Optional[str] = None,
        previous_user_message: Optional[str] = None,
    ) -> Dict[str, Any]:
        is_high_risk = predicted_class in HIGH_RISK_CLASSES
        current = (user_message or "").strip()
        context = (previous_user_message or "")[-500:] + " " + current
        is_indonesian = bool(INDONESIAN_MARKERS.search(current))

        if is_indonesian and predicted_class in INDONESIAN_RESPONSES:
            answer = INDONESIAN_RESPONSES[predicted_class]
        else:
            candidates: List[str] = self.loader.get_responses_for_class(predicted_class)
            if not candidates:
                logger.warning("No response templates for class '%s'", predicted_class)
                answer = SAFE_FALLBACK_RESPONSE
            else:
                seed = (current or predicted_class).encode("utf-8")
                idx = int.from_bytes(hashlib.sha256(seed).digest()[:4], "big") % len(candidates)
                if len(candidates) > 1 and candidates[idx] == last_response_text:
                    idx = (idx + 1) % len(candidates)
                answer = candidates[idx]

        if not is_high_risk and predicted_class in {"Anxiety", "Depression", "Neutral"}:
            topic = next(((en, indo) for regex, en, indo in TOPIC_PATTERNS if regex.search(context)), None)
            if topic:
                en, indo = topic
                prompt = (
                    f"Kalau kamu nyaman, bagian mana dari {indo} yang paling ingin kamu bahas?"
                    if is_indonesian else
                    f"If you'd like, which part of {en} would you most like to talk through?"
                )
                answer += "\n\n" + prompt

        return {
            "text": answer,
            "class_label": predicted_class,
            "is_high_risk": is_high_risk,
            "confidence": confidence,
        }
