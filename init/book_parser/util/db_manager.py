"""
Database Management Utility for Book Agent Reader.
Allows exporting, importing, and clearing the book-related tables.
"""
from __future__ import annotations
import json
import logging
import os
import sys
import gzip
from datetime import datetime
from pathlib import Path
from typing import Any

import click
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

# Add parent to path to import core modules
sys.path.append(str(Path(__file__).parent.parent))

from core.db import get_connection, transaction, clear_all_book_tables, get_table_counts
from core.display import console, prompt_typed_confirm

# Ordered list of tables for dependency-safe operations
# Export/Clear: Dependents first
# Import: Parents first
TABLE_ORDER = [
    "review_items",
    "processing_runs",
    "semantic_tags",
    "entity_beat_appearances",
    "entity_scene_appearances",
    "location_scene_appearances",
    "entity_aliases",
    "location_aliases",
    "story_beats",
    "scenes",
    "entities",
    "locations",
    "chapters",
    "books"
]

@click.group()
def cli():
    """DB Management Utility for Elysium Rising."""
    load_dotenv()

@cli.command()
@click.option('--output', '-o', type=click.Path(), help="Output file path (default: timestamped .json.gz)")
@click.option('--no-compress', is_flag=True, help="Disable GZIP compression.")
def export(output: str | None, no_compress: bool):
    """Export all book data to a JSON file."""
    conn = get_connection()
    
    # Generate default filename
    if not output:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        ext = "json" if no_compress else "json.gz"
        output = f"erp_export_{timestamp}.{ext}"
    
    output_path = Path(output)
    
    data = {}
    counts = get_table_counts(conn)
    
    console.print(f"[bold cyan]Exporting data to {output_path}...[/bold cyan]")
    
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            for table in reversed(TABLE_ORDER):
                console.print(f"  Reading {table} ({counts.get(table, 0)} rows)...")
                cur.execute(f"SELECT * FROM {table}")
                # Convert date/time to strings for JSON
                rows = []
                for row in cur.fetchall():
                    row_dict = dict(row)
                    for k, v in row_dict.items():
                        if isinstance(v, datetime):
                            row_dict[k] = v.isoformat()
                        elif v is not None and not isinstance(v, (str, int, float, bool, list, dict)):
                            row_dict[k] = str(v)
                    rows.append(row_dict)
                data[table] = rows
        
        # Write to file
        json_str = json.dumps(data, indent=2)
        if no_compress:
            output_path.write_text(json_str, encoding='utf-8')
        else:
            with gzip.open(output_path, 'wt', encoding='utf-8') as f:
                f.write(json_str)
                
        console.print(f"[bold green]✓ Export complete![/bold green] File size: {output_path.stat().st_size / 1024:.1f} KB")
        
    except Exception as e:
        console.print(f"[bold red]Export failed:[/bold red] {e}")
        sys.exit(1)
    finally:
        conn.close()

@cli.command()
@click.argument('input_file', type=click.Path(exists=True))
def import_db(input_file: str):
    """Import data from an export file (clears DB first)."""
    input_path = Path(input_file)
    
    confirmed = prompt_typed_confirm(
        f"This will WIPE the current database and replace it with data from {input_path.name}.",
        confirm_word="CONFIRM"
    )
    if not confirmed:
        console.print("Aborted.")
        return

    conn = get_connection()
    console.print(f"[bold cyan]Importing data from {input_path}...[/bold cyan]")
    
    try:
        # Load data
        if input_path.suffix == '.gz':
            with gzip.open(input_path, 'rt', encoding='utf-8') as f:
                data = json.load(f)
        else:
            data = json.loads(input_path.read_text(encoding='utf-8'))
            
        with transaction(conn):
            # 1. Clear
            console.print("  Clearing existing data...")
            clear_all_book_tables(conn)
            
            # 2. Insert in Parent-First order
            with conn.cursor() as cur:
                for table in reversed(TABLE_ORDER):
                    rows = data.get(table, [])
                    if not rows:
                        continue
                    
                    console.print(f"  Inserting {len(rows)} rows into {table}...")
                    
                    columns = rows[0].keys()
                    query = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({', '.join(['%s'] * len(columns))})"
                    
                    # Process rows
                    values = []
                    for r in rows:
                        values.append(tuple(r.values()))
                    
                    psycopg2.extras.execute_batch(cur, query, values)
                    
        console.print("[bold green]✓ Import successful![/bold green]")
        
    except Exception as e:
        console.print(f"[bold red]Import failed:[/bold red] {e}")
        sys.exit(1)
    finally:
        conn.close()

@cli.command()
def clear():
    """Wipe all book-related data from the database."""
    confirmed = prompt_typed_confirm(
        "This will permanently delete ALL book processing data.",
        confirm_word="CONFIRM"
    )
    if not confirmed:
        console.print("Aborted.")
        return

    conn = get_connection()
    try:
        with transaction(conn):
            counts = clear_all_book_tables(conn)
            console.print("[bold green]✓ Database cleared.[/bold green] Rows removed:")
            for table, count in counts.items():
                if count > 0:
                    console.print(f"  - {table}: {count}")
    except Exception as e:
        console.print(f"[bold red]Clear failed:[/bold red] {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    cli()
