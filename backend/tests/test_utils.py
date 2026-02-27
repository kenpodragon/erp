import pytest
from utils import is_profane, _profanity_blocklist

def test_is_profane_empty():
    assert is_profane("") is False
    assert is_profane(None) is False

def test_is_profane_clean():
    _profanity_blocklist.clear()
    _profanity_blocklist.add("badword")
    assert is_profane("this is a clean sentence") is False

def test_is_profane_dirty():
    _profanity_blocklist.clear()
    _profanity_blocklist.add("badword")
    assert is_profane("this contains a badword") is True
    assert is_profane("BADWORD") is True

def test_is_profane_partial_match():
    _profanity_blocklist.clear()
    _profanity_blocklist.add("badword")
    # should only match whole words by split() logic currently
    assert is_profane("badword") is True
    # wait, the code uses: words = text.lower().split()
    # "badwords" -> ["badwords"] not in {"badword"}
    assert is_profane("badwords") is False
