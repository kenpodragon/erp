/**
 * AssetRenderer — core rendering module with LRU cache and category dispatch.
 *
 * Singleton that dispatches render calls to the appropriate sub-renderer
 * based on asset category, maintains an LRU cache of rendered canvases,
 * and provides fallback rendering for missing definitions.
 */

import type { RenderResult } from './PlaceholderRenderer';
import * as EntityRenderer from './EntityRenderer';
import * as BackgroundRenderer from './BackgroundRenderer';
import * as IconRenderer from './IconRenderer';
import * as AvatarRenderer from './AvatarRenderer';
import * as PlaceholderRenderer from './PlaceholderRenderer';

export type { RenderResult };

export interface RenderDefinition {
  version?: number;
  [key: string]: unknown;
}

const MAX_CACHE_ENTRIES = 200;

interface CacheEntry {
  result: RenderResult;
  lastAccessed: number;
}

class AssetRendererClass {
  private cache = new Map<string, CacheEntry>();
  private auditedKeys = new Set<string>();

  /**
   * Render an asset by key, definition, and category.
   * Returns a cached result if available, otherwise renders and caches.
   */
  render(
    assetKey: string,
    definition: RenderDefinition,
    category: string,
  ): RenderResult {
    const cacheKey = this.buildCacheKey(assetKey, definition);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.result;
    }

    const renderer = this.getRenderer(category);
    const result = renderer(definition);

    this.cache.set(cacheKey, { result, lastAccessed: Date.now() });
    this.evictIfNeeded();

    return result;
  }

  /**
   * Render a fallback placeholder for an asset with no definition.
   * Logs to console and optionally POSTs to audit endpoint (once per key).
   */
  renderFallback(assetKey: string, category: string): RenderResult {
    const cacheKey = `__fallback__:${assetKey}:${category}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.result;
    }

    const result = PlaceholderRenderer.render(assetKey, category);

    // Optionally POST to dev_content_audit (fire-and-forget, once per key)
    if (!this.auditedKeys.has(assetKey)) {
      this.auditedKeys.add(assetKey);
      this.reportMissingAsset(assetKey, category);
    }

    this.cache.set(cacheKey, { result, lastAccessed: Date.now() });
    this.evictIfNeeded();

    return result;
  }

  /**
   * Clear the entire render cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size.
   */
  get cacheSize(): number {
    return this.cache.size;
  }

  // ── Private ──────────────────────────────────────────────────────────

  private buildCacheKey(assetKey: string, definition: RenderDefinition): string {
    return `${assetKey}:${JSON.stringify(definition)}`;
  }

  private getRenderer(category: string): (definition: any) => RenderResult {
    switch (category) {
      case 'entity_sprite':
      case 'class_sprite':
        return EntityRenderer.render;

      case 'background':
        return BackgroundRenderer.render;

      case 'item_icon':
      case 'artifact_icon':
      case 'achievement_icon':
      case 'skill_icon':
      case 'ui_icon':
        return IconRenderer.render;

      case 'avatar':
        return AvatarRenderer.render;

      // Stub categories — return placeholder until their C_ generators are built
      case 'skin':
      case 'badge':
      case 'flair':
      case 'spell_effect':
      case 'narrative_image':
      case 'portrait':
        return (def: any) => {
          const key = def?._asset_key || 'unknown';
          return PlaceholderRenderer.render(key, category);
        };

      default:
        return (def: any) => {
          const key = def?._asset_key || 'unknown';
          return PlaceholderRenderer.render(key, category);
        };
    }
  }

  private evictIfNeeded(): void {
    if (this.cache.size <= MAX_CACHE_ENTRIES) return;

    // Find and remove the least recently accessed entry
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private reportMissingAsset(assetKey: string, category: string): void {
    // Fire-and-forget POST to audit endpoint
    try {
      fetch('/api/game/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audit_type: 'missing_asset',
          asset_key: assetKey,
          category,
          source: 'frontend_renderer',
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Silently ignore — audit logging is best-effort
      });
    } catch {
      // Silently ignore
    }
  }
}

/** Singleton instance */
export const assetRenderer = new AssetRendererClass();
