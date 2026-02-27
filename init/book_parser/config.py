"""
Central configuration for the Book Agent Reader.
All paths, constants, and book registry live here.
"""
import os
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────
PARSER_DIR   = Path(__file__).parent                    # erp/init/book_parser/
PROJECT_ROOT = PARSER_DIR.parent.parent                 # erp/
BOOKS_DIR    = Path(os.getenv("BOOKS_DIR", str(PROJECT_ROOT.parent / "Books")))
LOG_DIR      = PARSER_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

# ── Book Registry ──────────────────────────────────────────────────────────
BOOK_REGISTRY: list[dict] = [
    {"book_number": 1, "title": "Elysium Rising",      "source_file": "ER_Kindle.docx"},
    {"book_number": 2, "title": "Elysium Fallen",       "source_file": "EF_Kindle.docx"},
    {"book_number": 3, "title": "Escape from Elysium",  "source_file": "EFE_Kindle.docx"},
]

BOOK_BY_NUMBER: dict[int, dict] = {b["book_number"]: b for b in BOOK_REGISTRY}

# ── Phase Names ────────────────────────────────────────────────────────────
PHASE_NAMES: dict[int, str] = {
    1: "Text Extraction & Structural Splitting",
    2: "AI Semantic Extraction",
    3: "Post-Processing & Consistency Validation",
    4: "Human-Assisted Review",
}

# ── Chapter Processing Status Values ──────────────────────────────────────
STATUS_NOT_STARTED    = "not_started"
STATUS_TEXT_EXTRACTED = "text_extracted"
STATUS_AI_EXTRACTED   = "ai_extracted"
STATUS_POST_PROCESSED = "post_processed"
STATUS_REVIEWED       = "reviewed"

# Status that qualifies a chapter as "done" for each phase
PHASE_DONE_STATUS: dict[int, str] = {
    1: STATUS_TEXT_EXTRACTED,
    2: STATUS_AI_EXTRACTED,
    3: STATUS_POST_PROCESSED,
    4: STATUS_REVIEWED,
}

# ── Minimum Entity Requirements (FR-2.8 – FR-2.10) ────────────────────────
MIN_ENTITIES_PER_BEAT    = 1
MIN_ENTITIES_PER_SCENE   = 3
MIN_ENTITIES_PER_CHAPTER = 10

# ── AI Models ──────────────────────────────────────────────────────────────
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

# Approximate token budget per AI call before we warn about context size
MAX_TOKENS_PER_CALL = 8192

# Hard break patterns that signal explicit scene breaks in the .docx
HARD_BREAK_PATTERNS = {"***", "* * *", "* * * * *", "---", "- - -", "⁂"}

# Docx heading styles that denote chapter boundaries (checked in order)
CHAPTER_HEADING_STYLES = {"Heading 1", "Heading1", "Chapter", "chapter"}
