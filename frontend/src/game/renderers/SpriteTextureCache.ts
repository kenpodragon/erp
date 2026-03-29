/**
 * SpriteTextureCache — shared module-level cache for entity SVG textures.
 *
 * Provides batch preloading (used by CombatStage outer before enemies spawn)
 * and synchronous cache lookup (used by EntityRenderer inside PixiJS tree).
 */

import { Texture } from 'pixi.js';
import { api } from '../../api';

/** Cached SVG textures keyed by asset_key (e.g. "entity_sprite_19"). */
export const svgTextureCache = new Map<string, Texture>();

/** Keys currently being fetched — prevents duplicate API calls. */
const fetching = new Set<string>();

/** Listeners notified when new textures arrive. */
const listeners = new Set<() => void>();

/** Subscribe to cache updates. Returns unsubscribe function. */
export function onCacheUpdate(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners(): void {
  for (const fn of listeners) fn();
}

/**
 * Preload SVG textures for a batch of sprite keys.
 * Fetches render_definitions from the backend, renders each svg_template
 * to a Canvas, converts to PixiJS Texture, and caches.
 *
 * Returns a Promise that resolves when ALL textures are loaded and cached.
 */
export async function preloadEntitySprites(spriteKeys: string[]): Promise<void> {
  const needed = spriteKeys.filter(k => k && !svgTextureCache.has(k) && !fetching.has(k));
  if (needed.length === 0) return;

  for (const key of needed) fetching.add(key);

  try {
    const res = await api.get(`/api/game/assets/batch?keys=${encodeURIComponent(needed.join(','))}`);
    if (!res.ok) return;

    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.items || []);

    // Load all SVG images in parallel
    const loadPromises: Promise<void>[] = [];

    for (const item of items) {
      if (item.render_definition?.svg_template && typeof item.render_definition.svg_template === 'string') {
        loadPromises.push(loadSvgToCache(item.asset_key, item.render_definition.svg_template, 128));
      }
    }

    await Promise.all(loadPromises);
  } catch {
    // Silent — procedural fallback will be used
  } finally {
    for (const key of needed) fetching.delete(key);
  }
}

/**
 * Load a single SVG string into the texture cache.
 * Returns a Promise that resolves when the texture is ready.
 */
function loadSvgToCache(key: string, svgStr: string, size: number): Promise<void> {
  if (svgTextureCache.has(key)) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, size, size);
      const tex = Texture.from(canvas);
      svgTextureCache.set(key, tex);
      notifyListeners();
      resolve();
    };
    img.onerror = () => resolve(); // Don't block on failure
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
  });
}
