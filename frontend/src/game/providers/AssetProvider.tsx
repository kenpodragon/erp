/**
 * AssetProvider — React context provider for asset data fetching/caching.
 *
 * Maintains an in-memory Map of asset definitions fetched from the backend,
 * and combines with AssetRenderer for rendering.
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { api } from '../../api';
import { assetRenderer, type RenderDefinition, type RenderResult } from '../renderers/AssetRenderer';

export interface AssetData {
  asset_key: string;
  category: string;
  render_definition: RenderDefinition;
  display_name?: string;
  tags?: string[];
}

interface AssetContextValue {
  /** Get a cached asset definition. Returns null if not loaded yet. */
  getAsset: (assetKey: string) => AssetData | null;
  /** Batch-fetch asset definitions from the API and cache them. */
  preloadBatch: (keys: string[]) => Promise<void>;
  /** Render an asset by key — combines getAsset + AssetRenderer. Returns null if not loaded. */
  renderAsset: (assetKey: string) => RenderResult | null;
  /** Render with fallback — returns placeholder if asset is not in registry. */
  renderAssetWithFallback: (assetKey: string, category: string) => RenderResult;
  /** Whether a batch preload is currently in progress. */
  isLoading: boolean;
}

const AssetContext = createContext<AssetContextValue | undefined>(undefined);

export const AssetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const assetCache = useRef(new Map<string, AssetData>());
  /** Keys that we've already tried to fetch and got 404 / not found */
  const missingKeys = useRef(new Set<string>());
  const [isLoading, setIsLoading] = useState(false);

  const getAsset = useCallback((assetKey: string): AssetData | null => {
    return assetCache.current.get(assetKey) || null;
  }, []);

  const preloadBatch = useCallback(async (keys: string[]): Promise<void> => {
    // Filter out already-cached and known-missing keys
    const needed = keys.filter(
      k => k && !assetCache.current.has(k) && !missingKeys.current.has(k),
    );
    if (needed.length === 0) return;

    setIsLoading(true);
    try {
      const queryKeys = needed.join(',');
      const res = await api.get(`/api/game/assets/batch?keys=${encodeURIComponent(queryKeys)}`);
      if (res.ok) {
        const data = await res.json();
        // The batch endpoint returns an array of asset objects
        const items: AssetData[] = Array.isArray(data) ? data : (data.items || []);
        const returnedKeys = new Set<string>();

        for (const item of items) {
          if (item.asset_key) {
            assetCache.current.set(item.asset_key, {
              asset_key: item.asset_key,
              category: item.category,
              render_definition: item.render_definition || {},
              display_name: item.display_name,
              tags: item.tags,
            });
            returnedKeys.add(item.asset_key);
          }
        }

        // Mark any requested keys that weren't returned as missing
        for (const key of needed) {
          if (!returnedKeys.has(key)) {
            missingKeys.current.add(key);
          }
        }
      } else if (res.status === 404) {
        // Endpoint doesn't exist yet — mark all as missing
        for (const key of needed) {
          missingKeys.current.add(key);
        }
      }
    } catch {
      // Network error — don't mark as missing so we retry later
    } finally {
      setIsLoading(false);
    }
  }, []);

  const renderAsset = useCallback((assetKey: string): RenderResult | null => {
    const asset = assetCache.current.get(assetKey);
    if (!asset) return null;

    return assetRenderer.render(assetKey, asset.render_definition, asset.category);
  }, []);

  const renderAssetWithFallback = useCallback(
    (assetKey: string, category: string): RenderResult => {
      const asset = assetCache.current.get(assetKey);
      if (asset) {
        return assetRenderer.render(assetKey, asset.render_definition, asset.category);
      }
      return assetRenderer.renderFallback(assetKey, category);
    },
    [],
  );

  const value: AssetContextValue = {
    getAsset,
    preloadBatch,
    renderAsset,
    renderAssetWithFallback,
    isLoading,
  };

  return <AssetContext.Provider value={value}>{children}</AssetContext.Provider>;
};

export const useAssets = (): AssetContextValue => {
  const context = useContext(AssetContext);
  if (context === undefined) {
    throw new Error('useAssets must be used within an AssetProvider');
  }
  return context;
};
