/**
 * AvatarPreset — renders an avatar from the Asset Registry onto a canvas.
 *
 * Self-contained component that fetches the render definition for a preset
 * avatar key, renders it via AvatarRenderer, and displays the result as a
 * canvas element. Falls back to a colored circle with initials on failure.
 *
 * Uses a module-level cache to avoid re-fetching definitions across instances.
 */

import React, { useRef, useEffect, useState } from 'react';
import { api } from '../api';
import * as AvatarRenderer from '../game/renderers/AvatarRenderer';

interface AvatarPresetProps {
  presetKey: string;     // e.g., "warrior", "mage"
  size?: number;         // default 64
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  onClick?: () => void;
  onError?: () => void;
}

interface CachedDefinition {
  render_definition: AvatarRenderer.RenderDefinition;
}

// Module-level cache — shared across all AvatarPreset instances
const definitionCache = new Map<string, CachedDefinition>();
const failedKeys = new Set<string>();
const pendingFetches = new Map<string, Promise<CachedDefinition | null>>();

async function fetchDefinition(presetKey: string): Promise<CachedDefinition | null> {
  const assetKey = `avatar_${presetKey}`;

  if (definitionCache.has(assetKey)) {
    return definitionCache.get(assetKey)!;
  }
  if (failedKeys.has(assetKey)) {
    return null;
  }

  // Deduplicate in-flight requests
  if (pendingFetches.has(assetKey)) {
    return pendingFetches.get(assetKey)!;
  }

  const promise = (async () => {
    try {
      // Try batch endpoint first (single key)
      const res = await api.get(`/api/game/assets/batch?keys=${encodeURIComponent(assetKey)}`);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.items || []);
        const match = items.find((i: any) => i.asset_key === assetKey);
        if (match?.render_definition) {
          const cached: CachedDefinition = { render_definition: match.render_definition };
          definitionCache.set(assetKey, cached);
          return cached;
        }
      }
      failedKeys.add(assetKey);
      return null;
    } catch {
      // Network error — don't add to failedKeys so we retry later
      return null;
    } finally {
      pendingFetches.delete(assetKey);
    }
  })();

  pendingFetches.set(assetKey, promise);
  return promise;
}

/**
 * Render a fallback colored circle with the first letter of the preset key.
 */
function renderFallback(canvas: HTMLCanvasElement, presetKey: string, size: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = size;
  canvas.height = size;

  // Dark background circle
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 2;

  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Border
  ctx.strokeStyle = '#7b5ea7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Initial letter
  const letter = presetKey.charAt(0).toUpperCase();
  const fontSize = Math.max(12, size * 0.4);
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = '#b8860b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, cx, cy);
}

export const AvatarPreset: React.FC<AvatarPresetProps> = ({
  presetKey,
  size = 64,
  className,
  style,
  alt,
  onClick,
  onError,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const doRender = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const def = await fetchDefinition(presetKey);

      if (cancelled) return;

      if (def?.render_definition) {
        // Use AvatarRenderer to render onto a temp canvas, then copy
        const renderDef = { ...def.render_definition, size };
        const result = AvatarRenderer.render(renderDef);

        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, size, size);
          ctx.drawImage(result.canvas, 0, 0, size, size);
        }
        setLoaded(true);
      } else {
        // Fallback
        renderFallback(canvas, presetKey, size);
        setLoaded(true);
        onError?.();
      }
    };

    doRender();
    return () => { cancelled = true; };
  }, [presetKey, size, onError]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'block',
        borderRadius: '4px',
        ...style,
      }}
      title={alt || presetKey}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    />
  );
};

export default AvatarPreset;
