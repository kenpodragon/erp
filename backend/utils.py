import os
import logging

logger = logging.getLogger(__name__)

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
