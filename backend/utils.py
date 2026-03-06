import os
import logging
import html
from typing import Optional

logger = logging.getLogger(__name__)

# --- Sanitization ---

def sanitize_text(text: Optional[str], max_length: int = 5000) -> Optional[str]:
    """
    Sanitize user-provided text:
    1. Trim whitespace.
    2. Escape HTML characters (XSS prevention).
    3. Truncate to max_length.
    """
    if text is None:
        return None
    
    # 1. Trim
    text = text.strip()
    
    # 2. Truncate
    if len(text) > max_length:
        text = text[:max_length]
        
    # 3. Escape HTML
    return html.escape(text)

# --- Profanity Filter ---

_profanity_blocklist = set()


def load_profanity_blocklist():
    """Load profanity blocklist from file into memory."""
    global _profanity_blocklist
    file_path = os.path.join(os.path.dirname(__file__), "profanity_blocklist.txt")
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip().lower()
                if line and not line.startswith("#"):
                    _profanity_blocklist.add(line)
    logger.info("Loaded %d words into profanity blocklist", len(_profanity_blocklist))


def is_profane(text: str) -> bool:
    """Check if text contains any word from the blocklist (case-insensitive)."""
    if not text:
        return False
    words = text.lower().split()
    for word in words:
        if word in _profanity_blocklist:
            return True
    return False


def check_profanity(text: str) -> str:
    """Replace any blocklist word occurrences with '*****' (case-insensitive)."""
    if not text or not _profanity_blocklist:
        return text
    words = text.split()
    result = []
    for word in words:
        if word.lower() in _profanity_blocklist:
            result.append("*****")
        else:
            result.append(word)
    return " ".join(result)
