"""High-precision Indonesian conversational cues.

This is a limited rule-based supplement, not a mental-health diagnosis.
Unrecognized messages continue to the trained classifier.
"""
import re
from typing import Optional

_GREETING = re.compile(r"^\s*(?:halo|hai|hi|hello|selamat\s+(?:pagi|siang|sore|malam))\s*[!?.]*\s*$", re.I)
_ANXIETY = re.compile(r"\b(?:cemas|khawatir|gelisah|panik|takut|deg.degan)\b", re.I)

def infer_simple_indonesian_theme(message: str) -> Optional[str]:
    if not isinstance(message, str):
        return None
    if _GREETING.fullmatch(message):
        return "Greeting"
    if re.search(r"\b(aku|saya|gue|gw)\b", message, re.I) and _ANXIETY.search(message):
        return "Anxiety"
    return None
