"""
Phase 4: Human-Assisted Review.

Presents each pending review_item interactively on the terminal:
  - Shows the item details (severity, category, description, suggestion).
  - User can: [A]ccept (mark accepted), [M]odify (add notes + accept), [S]kip.
  - After all items, marks chapters as 'reviewed'.

This phase is cross-book (all books reviewed together).
"""
from __future__ import annotations
import logging
from typing import Optional

from rich.console import Console
from rich.panel import Panel
from rich.text import Text

from config import BOOK_REGISTRY
from core.db import (
    get_book_id, get_chapters_for_book, update_chapter_status,
    get_pending_review_items, update_review_item, get_review_summary,
    transaction,
)
from core.display import ProgressTracker

logger = logging.getLogger("book_parser.phase4")
console = Console(highlight=False)

SEVERITY_STYLES = {
    "error":   ("bold red",   "🔴"),
    "warning": ("bold yellow","🟡"),
    "info":    ("cyan",       "🔵"),
}

CATEGORY_LABELS = {
    "entity_resolution":        "Entity Resolution",
    "description_inconsistency":"Description Inconsistency",
    "timeline_gap":             "Timeline Gap",
    "taxonomy_change":          "Taxonomy Change",
    "cross_provider_discrepancy":"Cross-Provider Discrepancy",
}


# ── Display helpers ────────────────────────────────────────────────────────

def _render_item(item: dict, index: int, total: int) -> Panel:
    sev = item.get("severity", "info")
    style, icon = SEVERITY_STYLES.get(sev, ("white", "⚪"))
    cat_label = CATEGORY_LABELS.get(item.get("category", ""), item.get("category", ""))

    body = Text()
    body.append(f"{icon} [{sev.upper()}]  ", style=style)
    body.append(f"{cat_label}\n\n", style="bold")
    body.append("Description:\n", style="bold cyan")
    body.append(f"  {item.get('description', '')}\n\n")
    body.append("Suggested Action:\n", style="bold cyan")
    body.append(f"  {item.get('suggested_action', '')}\n")

    # Context references
    refs = []
    if item.get("affected_entity_id"):
        refs.append(f"Entity ID: {item['affected_entity_id']}")
    if item.get("affected_location_id"):
        refs.append(f"Location ID: {item['affected_location_id']}")
    if item.get("affected_scene_id"):
        refs.append(f"Scene ID: {item['affected_scene_id']}")
    if item.get("affected_beat_id"):
        refs.append(f"Beat ID: {item['affected_beat_id']}")
    if refs:
        body.append("\nReferences: ", style="dim")
        body.append(", ".join(refs), style="dim")

    return Panel(
        body,
        title=f"[bold]Review Item {index}/{total}: {item.get('title', '')}[/bold]",
        border_style=style,
    )


def _prompt_action(item: dict) -> tuple[str, Optional[str]]:
    """
    Prompt the user for an action. Returns (action, notes).
    action: 'accepted' | 'rejected' | 'skipped'
    """
    while True:
        answer = console.input(
            "\n[bold]Action:[/bold] "
            "[[bold green]A[/bold green]]ccept  "
            "[[bold yellow]M[/bold yellow]]odify+Accept  "
            "[[bold red]R[/bold red]]eject  "
            "[[dim]S[/dim]]kip  : "
        ).strip().lower()

        if answer in ("a", "accept"):
            return "accepted", None

        if answer in ("m", "modify"):
            notes = console.input("[bold yellow]Notes (optional):[/bold yellow] ").strip()
            return "accepted", notes or None

        if answer in ("r", "reject"):
            notes = console.input("[bold red]Rejection reason (optional):[/bold red] ").strip()
            return "rejected", notes or None

        if answer in ("s", "skip", ""):
            return "skipped", None

        console.print("[red]Please enter A, M, R, or S[/red]")


# ── Main phase entry point ─────────────────────────────────────────────────

def run_phase4(conn, tracker: ProgressTracker) -> None:
    """
    Run Phase 4 interactive review. No AI calls — pure human review.
    """
    logger.info("Phase 4 — Human-Assisted Review")

    items = get_pending_review_items(conn)
    if not items:
        console.print(
            "\n[bold green]✓ No pending review items found.[/bold green]\n"
            "  Either Phase 3 found no issues, or all items were already reviewed."
        )
    else:
        console.print(
            f"\n[bold cyan]Phase 4 Review[/bold cyan] — "
            f"[bold]{len(items)}[/bold] pending items\n"
        )

        accepted = rejected = skipped = 0

        for idx, item in enumerate(items, start=1):
            console.print(_render_item(item, idx, len(items)))
            action, notes = _prompt_action(item)

            if action != "skipped":
                with transaction(conn):
                    update_review_item(conn, item["id"], action, notes)

            if action == "accepted":
                accepted += 1
                console.print("[green]  ✓ Accepted[/green]")
            elif action == "rejected":
                rejected += 1
                console.print("[red]  ✗ Rejected[/red]")
            else:
                skipped += 1
                console.print("[dim]  → Skipped[/dim]")

            console.print()

        # Summary
        summary = get_review_summary(conn)
        console.print(
            f"\n[bold]Review complete:[/bold] "
            f"[green]{accepted} accepted[/green], "
            f"[red]{rejected} rejected[/red], "
            f"[dim]{skipped} skipped[/dim]\n"
        )
        logger.info(
            "Review complete: %d accepted, %d rejected, %d skipped",
            accepted, rejected, skipped,
        )

    # Mark all chapters as 'reviewed'
    tracker.set_items("Marking chapters reviewed...", total=1)
    with transaction(conn):
        for book in BOOK_REGISTRY:
            book_id = get_book_id(conn, book["book_number"])
            if not book_id:
                continue
            chapters = get_chapters_for_book(conn, book_id)
            for ch in chapters:
                update_chapter_status(conn, ch["id"], "reviewed")
    tracker.advance_item()

    tracker.log("Phase 4 complete — all chapters marked as reviewed.", style="bold green")
    logger.info("Phase 4 complete.")
