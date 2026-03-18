/**
 * AssetIcon — renders an asset registry entry as an HTML <img> element.
 *
 * Fetches the render definition via AssetProvider, renders to canvas via
 * AssetRenderer, converts to a data-URL, and displays as a standard <img>.
 * Falls back to a placeholder when the asset is missing from the registry.
 */
import React, { useEffect, useState, useRef } from 'react';
import { useAssets } from '../providers/AssetProvider';

interface Props {
  assetKey: string;
  category: string;
  alt: string;
  className?: string;
  /** Fallback element when AssetProvider is not mounted or key is empty. */
  fallback?: React.ReactNode;
  draggable?: boolean;
  onContextMenu?: React.MouseEventHandler;
}

const dataUrlCache = new Map<string, string>();

const AssetIcon: React.FC<Props> = ({
  assetKey,
  category,
  alt,
  className,
  fallback = null,
  draggable,
  onContextMenu,
}) => {
  const [src, setSrc] = useState<string | null>(() => dataUrlCache.get(assetKey) ?? null);
  const preloaded = useRef(false);

  let assets: ReturnType<typeof useAssets> | null = null;
  try {
    assets = useAssets();
  } catch {
    // AssetProvider not mounted — render fallback
  }

  // Preload the asset definition on first mount
  useEffect(() => {
    if (!assets || !assetKey || preloaded.current) return;
    preloaded.current = true;
    assets.preloadBatch([assetKey]);
  }, [assets, assetKey]);

  // Render canvas → data URL whenever asset becomes available
  useEffect(() => {
    if (!assets || !assetKey) return;
    if (dataUrlCache.has(assetKey)) {
      setSrc(dataUrlCache.get(assetKey)!);
      return;
    }
    const result = assets.renderAssetWithFallback(assetKey, category);
    if (result?.canvas) {
      const url = result.canvas.toDataURL();
      dataUrlCache.set(assetKey, url);
      setSrc(url);
    }
  }, [assets, assetKey, category]);

  if (!assetKey || !assets) return <>{fallback}</>;
  if (!src) return <>{fallback}</>;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={draggable}
      onContextMenu={onContextMenu}
    />
  );
};

export default AssetIcon;
