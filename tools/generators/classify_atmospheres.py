"""
Classify scenes/chapters/books to atmosphere archetypes based on lore keywords.

Reads scene/chapter/book data from the database and suggests atmosphere
assignments based on keyword matching against the 13 atmosphere archetypes.

Usage:
  python tools/classify_atmospheres.py --dry-run
  python tools/classify_atmospheres.py --apply
  python tools/classify_atmospheres.py --show-unassigned
"""

import argparse
import os
import re
import sys

# Add repo root to path for imports
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

# ---------------------------------------------------------------------------
# Archetype keyword mappings
# ---------------------------------------------------------------------------

ARCHETYPE_KEYWORDS = {
    "mundane_dread": [
        "office", "corporate", "school", "mundane", "normal", "everyday",
        "fluorescent", "etheris", "surface", "routine", "work",
    ],
    "occult_sanctum": [
        "compound", "ritual", "occult", "sanctum", "basement", "bookshop",
        "candle", "ancient", "magic", "spell", "coven", "patrick",
    ],
    "liminal_purgatory": [
        "grey", "purgatory", "waiting", "liminal", "gas station", "infinite",
        "bureaucrat", "institutional", "void", "between", "benji",
    ],
    "body_horror_theatre": [
        "pallid", "mask", "horror", "body", "supernatural", "trailer",
        "transform", "monster", "creature", "grotesque",
    ],
    "ancient_sanctuary": [
        "paddock", "sanctuary", "library", "cosmic", "peace", "ancient",
        "wisdom", "meditat", "calm", "sacred", "nature",
    ],
    "cosmic_archive": [
        "akashic", "archive", "tower", "secrets", "knowledge", "record",
        "data", "information", "cosmic library",
    ],
    "tech_utopia": [
        "elysium", "station", "s corp", "technology", "utopia", "future",
        "clean", "sterile", "hopeful", "advanced",
    ],
    "alien_frontier": [
        "sorhhinda", "alien", "frontier", "organic", "unusual", "strange",
        "exotic", "foreign", "otherworld",
    ],
    "void_abyss": [
        "substrate", "void", "abyss", "prison", "cosmic seed", "darkness",
        "deep", "lovecraft", "impossible", "entropy",
    ],
    "domestic_trauma": [
        "childhood", "trailer", "home", "domestic", "abuse", "poverty",
        "lullaby", "family", "trauma", "memory",
    ],
    "glitch_reality": [
        "glitch", "simulation", "broken", "digital", "error", "crash",
        "corrupt", "matrix", "reality",
    ],
    "conspiracy_bunker": [
        "todd", "bunker", "conspiracy", "paranoid", "radio", "static",
        "underground", "hidden", "secret",
    ],
    "training_grounds": [
        "training", "practice", "dojo", "exercise", "spar",
    ],
}


def score_text(text: str, archetype: str) -> int:
    """Score how well text matches an archetype based on keyword hits."""
    if not text:
        return 0
    text_lower = text.lower()
    keywords = ARCHETYPE_KEYWORDS.get(archetype, [])
    score = 0
    for kw in keywords:
        if kw in text_lower:
            score += 1
    return score


def classify_text(text: str) -> list:
    """Return ranked list of (archetype, score) for the given text."""
    scores = []
    for archetype in ARCHETYPE_KEYWORDS:
        s = score_text(text, archetype)
        if s > 0:
            scores.append((archetype, s))
    scores.sort(key=lambda x: -x[1])
    return scores


def main():
    parser = argparse.ArgumentParser(description="Classify scenes/chapters/books to atmosphere archetypes")
    parser.add_argument("--dry-run", action="store_true", help="Show suggestions without applying")
    parser.add_argument("--apply", action="store_true", help="Apply suggestions to database")
    parser.add_argument("--show-unassigned", action="store_true", help="Show items without atmosphere assignments")
    parser.add_argument("--text", type=str, help="Classify arbitrary text (no DB access)")

    args = parser.parse_args()

    if args.text:
        results = classify_text(args.text)
        if results:
            print("Archetype suggestions:")
            for archetype, score in results:
                print(f"  {archetype:25s}  score: {score}")
        else:
            print("No strong archetype match found.")
        return

    # Database access
    try:
        from dotenv import load_dotenv
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", ".env")
        load_dotenv(env_path)

        from sqlmodel import Session, select, create_engine
        from models import Scene, Chapter, Book, Atmosphere
        from models.gameplay import SceneGameplayData

        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            print("ERROR: DATABASE_URL not set in backend/.env", file=sys.stderr)
            sys.exit(1)

        engine = create_engine(db_url)
    except ImportError as e:
        print(f"ERROR: Could not import required modules: {e}", file=sys.stderr)
        print("Run from project root with backend dependencies installed.", file=sys.stderr)
        sys.exit(1)

    with Session(engine) as session:
        # Load atmospheres for ID lookup
        atmospheres = {a.archetype: a.id for a in session.exec(select(Atmosphere)).all()}

        if args.show_unassigned:
            # Show scenes without atmosphere assignment
            scenes = session.exec(select(Scene)).all()
            unassigned = []
            for scene in scenes:
                sgd = session.exec(
                    select(SceneGameplayData).where(SceneGameplayData.scene_id == scene.id)
                ).first()
                if not sgd or not sgd.atmosphere_id:
                    chapter = session.get(Chapter, scene.chapter_id)
                    if not chapter or not chapter.atmosphere_id:
                        unassigned.append(scene)

            print(f"\nUnassigned scenes (no scene or chapter atmosphere): {len(unassigned)}")
            for scene in unassigned[:50]:
                print(f"  Scene #{scene.id}: {scene.title or '(untitled)'}")
            if len(unassigned) > 50:
                print(f"  ... and {len(unassigned) - 50} more")
            return

        # Classify chapters
        chapters = session.exec(select(Chapter)).all()
        suggestions = []

        for chapter in chapters:
            if chapter.atmosphere_id:
                continue

            text = f"{chapter.title or ''} {chapter.summary or ''}"
            results = classify_text(text)
            if results:
                best_archetype, best_score = results[0]
                if best_archetype in atmospheres:
                    suggestions.append({
                        "type": "chapter",
                        "id": chapter.id,
                        "title": chapter.title,
                        "archetype": best_archetype,
                        "atmosphere_id": atmospheres[best_archetype],
                        "score": best_score,
                    })

        print(f"\nSuggestions: {len(suggestions)} chapters without atmosphere")
        for s in suggestions:
            action = "WOULD ASSIGN" if args.dry_run else "ASSIGNING"
            print(f"  {action} Chapter #{s['id']} ({s['title']}) -> {s['archetype']} (score: {s['score']})")

            if args.apply:
                chapter = session.get(Chapter, s["id"])
                if chapter:
                    chapter.atmosphere_id = s["atmosphere_id"]
                    session.add(chapter)

        if args.apply:
            session.commit()
            print(f"\nApplied {len(suggestions)} assignments.")
        elif not args.dry_run:
            print("\nUse --dry-run to preview or --apply to write to database.")


if __name__ == "__main__":
    main()
