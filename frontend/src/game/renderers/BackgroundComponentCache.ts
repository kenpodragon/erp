/**
 * BackgroundComponentCache — pre-fetches and caches all bg_component and
 * bg_element_def assets at startup for instant lookup during rendering.
 *
 * Total payload is ~300KB (500 bytes × 600 variants), comparable to a single
 * image asset. This eliminates per-background API latency during assembly.
 */

import { api } from '../../api';
import type { ElementDefinition, ComponentVariant, ComponentCache } from './BackgroundRenderer';

class BackgroundComponentCacheImpl implements ComponentCache {
  private elementDefs = new Map<string, ElementDefinition>();
  private components = new Map<string, ComponentVariant>();
  private _isReady = false;
  private _loadPromise: Promise<void> | null = null;

  get isReady(): boolean {
    return this._isReady;
  }

  getElementDef(elementType: string): ElementDefinition | null {
    // Look up by element_type field, keyed by asset_key like "elem_def_streetlight"
    const defKey = `elem_def_${elementType}`;
    return this.elementDefs.get(defKey) || null;
  }

  getComponent(assetKey: string): ComponentVariant | null {
    return this.components.get(assetKey) || null;
  }

  /**
   * Fetch all bg_element_def and bg_component assets from the API.
   * Returns a promise that resolves when loading is complete.
   * Safe to call multiple times — subsequent calls return the same promise.
   */
  async load(): Promise<void> {
    if (this._isReady) return;
    if (this._loadPromise) return this._loadPromise;

    this._loadPromise = this._doLoad();
    return this._loadPromise;
  }

  private async _doLoad(): Promise<void> {
    try {
      // Fetch both categories in parallel
      const [defsRes, compsRes] = await Promise.all([
        api.get('/api/game/assets/batch?category=bg_element_def'),
        api.get('/api/game/assets/batch?category=bg_component'),
      ]);

      if (defsRes.ok) {
        const data = await defsRes.json();
        const items = Array.isArray(data) ? data : (data.items || []);
        for (const item of items) {
          if (item.asset_key && item.render_definition) {
            this.elementDefs.set(item.asset_key, item.render_definition as ElementDefinition);
          }
        }
      }

      if (compsRes.ok) {
        const data = await compsRes.json();
        const items = Array.isArray(data) ? data : (data.items || []);
        for (const item of items) {
          if (item.asset_key && item.render_definition) {
            this.components.set(item.asset_key, item.render_definition as ComponentVariant);
          }
        }
      }

      this._isReady = true;
    } catch (err) {
      console.error('BackgroundComponentCache: failed to load', err);
      // Mark as ready anyway so rendering can proceed with gradient-only fallbacks
      this._isReady = true;
    }
  }
}

/** Singleton instance — import and use directly. */
export const backgroundComponentCache = new BackgroundComponentCacheImpl();
