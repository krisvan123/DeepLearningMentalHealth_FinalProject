"""Independent conservative safety cues for a research prototype.

This heuristic is not clinical screening and cannot detect every concerning message.
"""
import re

_PATTERNS = (
    re.compile(r"\b(?:i\s+(?:want|plan|intend)\s+to\s+(?:die|kill\s+myself|end\s+my\s+life)|i(?:'m|\s+am)\s+(?:going\s+to|thinking\s+about)\s+(?:killing\s+myself|ending\s+my\s+life)|i\s+(?:want|plan)\s+to\s+hurt\s+myself)\b", re.I),
    re.compile(r"\b(?:aku|saya|gue|gw)\s+(?:(?:ingin|mau|pengen|berencana)\s+(?:bunuh\s+diri|mengakhiri\s+hidup|menyakiti\s+diri\s+sendiri)|(?:kepikiran|berpikir\s+untuk)\s+(?:bunuh\s+diri|mengakhiri\s+hidup))\b", re.I),
)

def needs_crisis_support(message: str) -> bool:
    """Detect limited explicit first-person safety cues, not a diagnosis."""
    return isinstance(message, str) and any(p.search(message) for p in _PATTERNS)
