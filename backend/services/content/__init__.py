"""Admin Content Editor service package.

Modules:
  helpers      — shared _now(), _paginate() utilities
  books        — Books CRUD
  chapters     — Chapters CRUD
  scenes       — Scenes CRUD with gameplay data and boss config
  backgrounds  — Backgrounds CRUD
  waves        — Wave configs, templates, bulk operations, auto-populate
"""

from services.content.books import list_books, get_book, create_book, update_book, delete_book
from services.content.chapters import list_chapters, get_chapter, create_chapter, update_chapter, delete_chapter
from services.content.scenes import list_scenes, get_scene, create_scene, update_scene, delete_scene
from services.content.backgrounds import list_backgrounds, get_background, create_background, update_background, delete_background
from services.content.waves import (
    get_wave_config, upsert_wave_config, delete_wave_config,
    list_wave_configs, apply_wave_template, bulk_adjust_multipliers,
    auto_populate_wave_config,
)
