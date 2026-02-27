"""
Book Agent Reader — main CLI entrypoint.

Usage:
  python book_processor.py               # auto-detect state, resume
  python book_processor.py --status      # show status table and exit
  python book_processor.py --clear-db    # clear all book tables (requires CONFIRM)
  python book_processor.py --verbose     # enable DEBUG logging
"""
from __future__ import annotations
import logging
import sys

import click

from config import BOOK_REGISTRY, BOOK_BY_NUMBER, PHASE_NAMES
from core.ai_provider import AIProvider, TokenLimitError
from core.db_init import ensure_schema
from core.db import (
    get_connection, transaction,
    get_processing_status, get_next_action, get_incomplete_run,
    start_processing_run, update_processing_run,
    get_chapters_for_book, get_book_id,
    clear_all_book_tables,
)
from core.display import (
    setup_logging, print_status, ProgressTracker,
    prompt_confirm, prompt_typed_confirm, warn_incomplete_run,
)
from phases.phase1_extract import run_phase1
from phases.phase2_ai import run_phase2
from phases.phase3_consistency import run_phase3
from phases.phase4_review import run_phase4

logger = logging.getLogger("book_parser")


# ── Resume helpers ────────────────────────────────────────────────────────

def _find_resume_chapter(conn, book_number: int, phase: int) -> int:
    """
    Return the last chapter_number that was successfully completed for the
    given book + phase (or beyond), so we can skip it and resume from the next one.
    Returns 0 if nothing was completed yet.
    """
    book_id = get_book_id(conn, book_number)
    if not book_id:
        return 0

    from config import PHASE_DONE_STATUS, STATUS_ORDER
    done_status = PHASE_DONE_STATUS[phase]
    threshold_idx = STATUS_ORDER.index(done_status)
    valid_statuses = STATUS_ORDER[threshold_idx:]

    with conn.cursor() as cur:
        cur.execute("""
            SELECT MAX(chapter_number) FROM chapters
            WHERE book_id = %s AND processing_status IN %s
        """, (book_id, tuple(valid_statuses)))
        row = cur.fetchone()
        return row[0] if row and row[0] is not None else 0


# ── Phase orchestration ───────────────────────────────────────────────────

def _run_phase_for_book(conn, phase: int, book_number: int,
                        ai: AIProvider, tracker: ProgressTracker,
                        resume_after: int = 0) -> None:
    """Dispatch a single phase for a single book. Updates processing_run records."""
    book_meta = BOOK_BY_NUMBER[book_number]
    book_id = get_book_id(conn, book_number)
    if not book_id:
        # Phase 1 creates it; for phases 2+ it must already exist
        from core.db import get_or_create_book
        with transaction(conn):
            book_id = get_or_create_book(
                conn, book_number, book_meta["title"], book_meta["source_file"]
            )

    with transaction(conn):
        run_id = start_processing_run(conn, book_id, phase)

    try:
        if phase == 1:
            run_phase1(conn, book_number, ai, tracker,
                       resume_after_chapter=resume_after or None)
        elif phase == 2:
            run_phase2(conn, book_number, ai, tracker,
                       resume_after_chapter=resume_after or None)
        else:
            raise ValueError(f"Phase {phase} is not book-scoped")

        with transaction(conn):
            update_processing_run(
                conn, run_id, "completed",
                claude_tokens=ai.usage.claude_tokens,
                gemini_tokens=ai.usage.gemini_tokens,
            )

    except TokenLimitError as e:
        logger.error("Token limit reached: %s", e)
        with transaction(conn):
            update_processing_run(
                conn, run_id, "stopped_token_limit",
                claude_tokens=ai.usage.claude_tokens,
                gemini_tokens=ai.usage.gemini_tokens,
                error_message=str(e),
            )
        raise

    except Exception as e:
        logger.error("Phase %d failed for Book %d: %s", phase, book_number, e)
        with transaction(conn):
            update_processing_run(
                conn, run_id, "failed",
                claude_tokens=ai.usage.claude_tokens,
                gemini_tokens=ai.usage.gemini_tokens,
                error_message=str(e),
            )
        raise


def _run_cross_book_phase(conn, phase: int,
                          ai: AIProvider, tracker: ProgressTracker) -> None:
    """Run a cross-book phase (3 or 4) that has no per-book processing_run."""
    if phase == 3:
        run_phase3(conn, ai, tracker)
    elif phase == 4:
        run_phase4(conn, tracker)
    else:
        raise ValueError(f"Unknown cross-book phase: {phase}")


# ── Main CLI ──────────────────────────────────────────────────────────────

@click.command(context_settings={"help_option_names": ["-h", "--help"]})
@click.option("--status", "show_status", is_flag=True,
              help="Print processing status table and exit.")
@click.option("--clear-db", "clear_db", is_flag=True,
              help="Clear all book processing tables (requires typing CONFIRM).")
@click.option("--verbose", "-v", is_flag=True,
              help="Enable DEBUG-level logging.")
def main(show_status: bool, clear_db: bool, verbose: bool) -> None:
    """
    Book Agent Reader — processes the Towers of Elysium trilogy.

    Default (no flags): auto-detect DB state and resume processing.
    """
    setup_logging(verbose=verbose)
    conn = get_connection()

    try:
        # ── Schema initialisation ─────────────────────────────────────────
        try:
            created = ensure_schema(conn)
            if created:
                click.echo("[bold green]✓ Database schema initialised.[/bold green]")
        except FileNotFoundError as e:
            click.echo(f"[bold red]Error:[/bold red] {e}")
            sys.exit(1)
        except RuntimeError as e:
            click.echo(f"[bold red]Schema initialisation failed:[/bold red] {e}")
            sys.exit(1)

        # ── --status ──────────────────────────────────────────────────────
        if show_status:
            status = get_processing_status(conn)
            next_action = get_next_action(conn)
            print_status(status, next_action)
            return

        # ── --clear-db ────────────────────────────────────────────────────
        if clear_db:
            status = get_processing_status(conn)
            print_status(status, get_next_action(conn))

            confirmed = prompt_typed_confirm(
                "This will permanently delete ALL book processing data from the database.",
                confirm_word="CONFIRM",
            )
            if not confirmed:
                click.echo("Aborted — database unchanged.")
                return

            with transaction(conn):
                counts = clear_all_book_tables(conn)

            click.echo("\nDatabase cleared. Rows removed:")
            for table, count in counts.items():
                click.echo(f"  {table}: {count}")
            return

        # ── Default: resume / start ───────────────────────────────────────
        status = get_processing_status(conn)
        next_action = get_next_action(conn)
        print_status(status, next_action)

        if next_action is None:
            click.echo("\n[bold green]✓ All processing is complete.[/bold green]")
            return

        # Check for an interrupted prior run and show note, but don't prompt
        incomplete = get_incomplete_run(conn)
        if incomplete:
            from core.display import console
            console.print(
                f"\n[bold yellow]⚠  Note:[/bold yellow] Resuming from interrupted run.\n"
                f"   Book {incomplete['book_number']}: {incomplete['book_title']}, Phase {incomplete['phase']}\n"
                f"   Last completed chapter: {incomplete.get('last_chapter_number', 'none')}\n"
            )

        # Determine resume point
        current_phase, current_book = next_action
        resume_after = _find_resume_chapter(conn, current_book, current_phase)

        ai = AIProvider()

        # Initial prompt at start
        from core.display import prompt_phase_start
        start_action = prompt_phase_start(current_phase, PHASE_NAMES[current_phase], 
                                  BOOK_BY_NUMBER[current_book] if current_phase in (1,2) else None, ai)
        
        if start_action == "clear":
            # Reuse clear-db logic
            confirmed = prompt_typed_confirm(
                "This will permanently delete ALL book processing data from the database.",
                confirm_word="CONFIRM",
            )
            if confirmed:
                with transaction(conn):
                    clear_all_book_tables(conn)
                click.echo("Database cleared. Please restart the processor.")
            return
        elif not start_action:
            click.echo("Exiting — no changes made.")
            return

        with ProgressTracker() as tracker:
            # Iterate through all phases sequentially
            for phase in range(1, 5):
                phase_name = PHASE_NAMES[phase]

                # Phases 1 and 2: process book by book
                if phase in (1, 2):
                    for book in BOOK_REGISTRY:
                        bn = book["book_number"]
                        ph_status = get_processing_status(conn)

                        info = ph_status[bn][phase]
                        if info["total"] > 0 and info["done"] >= info["total"]:
                            logger.debug(
                                "Phase %d Book %d already complete — skipping", phase, bn
                            )
                            continue

                        # Ask to proceed between books or phases
                        if phase > current_phase or (phase == current_phase and bn > current_book):
                            print_status(get_processing_status(conn), get_next_action(conn))
                            loop_action = prompt_phase_start(phase, phase_name, book, ai)
                            
                            if loop_action == "clear":
                                confirmed = prompt_typed_confirm(
                                    "This will permanently delete ALL book processing data.",
                                    confirm_word="CONFIRM",
                                )
                                if confirmed:
                                    with transaction(conn):
                                        clear_all_book_tables(conn)
                                    click.echo("Database cleared. Exiting.")
                                return
                            elif not loop_action:
                                click.echo("Stopping as requested.")
                                return

                        this_resume = resume_after if (phase == current_phase and bn == current_book) else 0
                        try:
                            _run_phase_for_book(conn, phase, bn, ai, tracker, resume_after=this_resume)
                        except TokenLimitError:
                            click.echo(
                                "\n[red]Both AI providers exhausted. "
                                "Re-run to resume from this point.[/red]"
                            )
                            sys.exit(1)
                        except Exception as e:
                            click.echo(f"\n[red]Error: {e}[/red]")
                            sys.exit(1)

                # Phases 3 and 4: cross-book
                else:
                    # Check if this phase is already done for all books
                    ph_status = get_processing_status(conn)
                    all_done = all(
                        ph_status[b["book_number"]][phase]["done"] >= ph_status[b["book_number"]][phase]["total"] > 0
                        for b in BOOK_REGISTRY
                    )
                    if all_done:
                        logger.debug("Phase %d already complete — skipping", phase)
                        continue

                    # Confirm before starting cross-book phase
                    if phase > current_phase:
                        print_status(get_processing_status(conn), get_next_action(conn))
                        cross_action = prompt_phase_start(phase, phase_name, None, ai)
                        
                        if cross_action == "clear":
                            confirmed = prompt_typed_confirm(
                                "This will permanently delete ALL book processing data.",
                                confirm_word="CONFIRM",
                            )
                            if confirmed:
                                with transaction(conn):
                                    clear_all_book_tables(conn)
                                click.echo("Database cleared. Exiting.")
                            return
                        elif not cross_action:
                            click.echo("Stopping as requested.")
                            return

                    try:
                        _run_cross_book_phase(conn, phase, ai, tracker)
                    except Exception as e:
                        click.echo(f"\n[red]Error in Phase {phase}: {e}[/red]")
                        sys.exit(1)

        # Final status display
        print_status(get_processing_status(conn), get_next_action(conn))
        click.echo("\n✓ Processing complete.")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
