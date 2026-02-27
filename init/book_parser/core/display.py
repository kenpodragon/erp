"""
Rich-based console display: status table, progress bars, logging.
"""
from __future__ import annotations
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

from rich.console import Console
from rich.live import Live
from rich.logging import RichHandler
from rich.panel import Panel
from rich.progress import (
    BarColumn, MofNCompleteColumn, Progress, SpinnerColumn,
    TaskProgressColumn, TextColumn, TimeElapsedColumn,
)
from rich.table import Table
from rich.text import Text

from config import BOOK_REGISTRY, PHASE_NAMES, LOG_DIR

console = Console(highlight=False)


# ── Logging setup ──────────────────────────────────────────────────────────

def setup_logging(verbose: bool = False) -> None:
    """Configure rich logging to console + rotating file."""
    level = logging.DEBUG if verbose else logging.INFO

    log_file = LOG_DIR / f"book_parser_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

    logging.basicConfig(
        level=level,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
        handlers=[
            RichHandler(console=console, rich_tracebacks=True, show_path=False),
            logging.FileHandler(log_file, encoding="utf-8"),
        ],
    )
    logging.getLogger("book_parser").setLevel(level)


# ── Status Table ───────────────────────────────────────────────────────────

def render_status_table(status: dict, next_action: Optional[tuple[int, int]]) -> Panel:
    """
    Render a Rich table showing processing progress for all books × phases.
    status = {book_number: {phase: {"done": int, "total": int}}}
    """
    table = Table(show_header=True, header_style="bold cyan", box=None, padding=(0, 1))
    table.add_column("Book", style="bold", min_width=26)
    for phase in range(1, 5):
        table.add_column(f"Phase {phase}", justify="center", min_width=10)

    for book in BOOK_REGISTRY:
        bn = book["book_number"]
        row_cells = [f"{bn}: {book['title']}"]
        for phase in range(1, 5):
            info = status[bn][phase]
            done, total = info["done"], info["total"]
            if total == 0:
                cell = Text("--", style="dim")
            elif done == total and total > 0:
                cell = Text(f"✓ {done}/{total}", style="bold green")
            elif done > 0:
                cell = Text(f"{done}/{total} ch", style="yellow")
            else:
                cell = Text("--", style="dim")
            row_cells.append(cell)
        table.add_row(*row_cells)

    if next_action:
        phase, bn = next_action
        book_title = BOOK_REGISTRY[bn - 1]["title"]
        footer = f"\n[bold]Next:[/bold] Phase {phase} ({PHASE_NAMES[phase]}) for Book {bn}: {book_title}"
    else:
        footer = "\n[bold green]✓ All phases complete![/bold green]"

    return Panel(table, title="[bold]Book Agent Reader — Status Overview[/bold]",
                 subtitle=footer, border_style="blue")


def print_status(status: dict, next_action: Optional[tuple[int, int]]) -> None:
    console.print(render_status_table(status, next_action))


# ── Progress Bars ──────────────────────────────────────────────────────────

def make_progress() -> Progress:
    return Progress(
        SpinnerColumn(),
        TextColumn("[bold blue]{task.description}"),
        BarColumn(),
        MofNCompleteColumn(),
        TaskProgressColumn(),
        TimeElapsedColumn(),
        console=console,
        transient=False,
    )


class ProgressTracker:
    """Manages a Live display with a progress bar + status line."""

    def __init__(self) -> None:
        self.progress = make_progress()
        self._book_task = None
        self._chapter_task = None
        self._item_task = None
        self._live: Optional[Live] = None

    def start(self) -> None:
        self._live = Live(self.progress, console=console, refresh_per_second=4)
        self._live.start()

    def stop(self) -> None:
        if self._live:
            self._live.stop()

    def set_book(self, book_number: int, title: str, phase: int) -> None:
        if self._book_task is not None:
            self.progress.remove_task(self._book_task)
        self._book_task = self.progress.add_task(
            f"[cyan]Phase {phase} — Book {book_number}: {title}",
            total=None, start=False
        )
        self.progress.start_task(self._book_task)

    def set_chapters(self, total: int) -> None:
        if self._chapter_task is not None:
            self.progress.remove_task(self._chapter_task)
        self._chapter_task = self.progress.add_task("[white]Chapters", total=total)

    def advance_chapter(self, chapter_title: str = "") -> None:
        if self._chapter_task is not None:
            label = f"[white]Chapter: {chapter_title}" if chapter_title else "[white]Chapters"
            self.progress.update(self._chapter_task, advance=1, description=label)

    def set_items(self, description: str, total: int) -> None:
        if self._item_task is not None:
            self.progress.remove_task(self._item_task)
        self._item_task = self.progress.add_task(f"[dim]{description}", total=total)

    def advance_item(self) -> None:
        if self._item_task is not None:
            self.progress.advance(self._item_task)

    def log(self, message: str, style: str = "white") -> None:
        console.log(f"[{style}]{message}[/{style}]")

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, *_):
        self.stop()


# ── Prompts / Confirmations ────────────────────────────────────────────────

def prompt_confirm(message: str) -> bool:
    """Ask y/n. Returns True for yes."""
    while True:
        answer = console.input(f"[bold yellow]{message}[/bold yellow] [dim](y/n)[/dim] ").strip().lower()
        if answer in ("y", "yes"):
            return True
        if answer in ("n", "no"):
            return False
        console.print("[red]Please enter y or n[/red]")


def prompt_typed_confirm(message: str, confirm_word: str = "CONFIRM") -> bool:
    """Ask user to type a specific word. Returns True if they do."""
    answer = console.input(f"[bold red]{message}[/bold red]\nType '[bold]{confirm_word}[/bold]' to proceed: ").strip()
    return answer == confirm_word


def warn_incomplete_run(run: dict) -> bool:
    """Warn about a prior incomplete run and ask if user wants to resume."""
    console.print(
        f"\n[bold yellow]⚠  Warning:[/bold yellow] Previous processing was interrupted.\n"
        f"   Book {run['book_number']}: {run['book_title']}, Phase {run['phase']}\n"
        f"   Status: [yellow]{run['status']}[/yellow]\n"
        f"   Last completed chapter: {run.get('last_chapter_number', 'none')}\n"
        f"   Started at: {run['started_at']}\n"
    )
    return prompt_confirm("Resume from this point?")
