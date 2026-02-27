import os
import io
import logging
from PIL import Image
from fastapi import UploadFile

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


# --- Image Processing ---


def process_avatar(file: UploadFile, player_id: int) -> dict:
    """
    Validate, resize, and save avatar images.
    Returns a dict with paths to the saved images.
    """
    # Ensure upload directory exists
    base_dir = os.path.join(os.path.dirname(__file__), "uploads", "avatars")
    os.makedirs(base_dir, exist_ok=True)

    # Read image
    try:
        content = file.file.read()
        image = Image.open(io.BytesIO(content))
    except Exception as e:
        logger.error("Failed to open image: %s", e)
        raise ValueError("Invalid image file")

    # Basic validation
    if image.format not in ("JPEG", "PNG"):
        raise ValueError("Only JPEG and PNG images are supported")

    # Generate filename base
    filename_base = f"player_{player_id}_{int(os.path.getmtime(__file__))}"

    results = {}
    for size in (128, 256):
        resized = image.copy()
        resized.thumbnail((size, size))

        # Handle transparency for JPEG
        if image.mode in ("RGBA", "P") and image.format == "JPEG":
            resized = resized.convert("RGB")

        ext = image.format.lower()
        filename = f"{filename_base}_{size}.{ext}"
        save_path = os.path.join(base_dir, filename)

        resized.save(save_path)
        # We return the relative path from the backend root
        results[f"url_{size}"] = f"/uploads/avatars/{filename}"

    return results
