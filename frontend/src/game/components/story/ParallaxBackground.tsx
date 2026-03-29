import React, { useRef, useState, useEffect } from 'react';
import { useTick, extend } from '@pixi/react';
import { Texture, TilingSprite } from 'pixi.js';
import { api } from '../../../api';
import * as BackgroundRenderer from '../../renderers/BackgroundRenderer';
import { backgroundComponentCache } from '../../renderers/BackgroundComponentCache';

// Register for v8 JSX
extend({ TilingSprite });

interface ParallaxBackgroundProps {
  width: number;
  height: number;
  chapterId: number;
  waveCount: number;
}

/** Canvas widths per layer — mismatched to hide tiling seams. */
const LAYER_WIDTHS = { far: 2048, mid: 1536, near: 1024 } as const;

/** Module-level cache for background definitions. */
const bgDefCache = new Map<string, BackgroundRenderer.RenderDefinition>();
const bgDefFailed = new Set<string>();

/** Fetch background layer info: scene → background → asset_registry FK columns. */
async function fetchLayerDefs(chapterId: number): Promise<{
  far: BackgroundRenderer.RenderDefinition | null;
  mid: BackgroundRenderer.RenderDefinition | null;
  near: BackgroundRenderer.RenderDefinition | null;
}> {
  // Try per-chapter background via scene → background FK chain
  const cacheKey = `ch_${chapterId}`;
  if (bgDefCache.has(`${cacheKey}_far`)) {
    return {
      far: bgDefCache.get(`${cacheKey}_far`) || null,
      mid: bgDefCache.get(`${cacheKey}_mid`) || null,
      near: bgDefCache.get(`${cacheKey}_near`) || null,
    };
  }

  // Fetch per-chapter assets + defaults as fallback
  const farKey = `bg_ch${chapterId}_far`;
  const midKey = `bg_ch${chapterId}_mid`;
  const nearKey = `bg_ch${chapterId}_near`;
  const defaultKeys = ['bg_default_far', 'bg_default_mid', 'bg_default_near'];

  const allKeys = [...new Set([farKey, midKey, nearKey, ...defaultKeys])].filter(k => !bgDefFailed.has(k));
  if (allKeys.length === 0) return { far: null, mid: null, near: null };

  try {
    const res = await api.get(`/api/game/assets/batch?keys=${encodeURIComponent(allKeys.join(','))}`);
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.items || []);
      const byKey = new Map(items.map((i: any) => [i.asset_key, i.render_definition]));

      for (const key of allKeys) {
        if (byKey.has(key)) {
          bgDefCache.set(key, byKey.get(key)! as BackgroundRenderer.RenderDefinition);
        } else {
          bgDefFailed.add(key);
        }
      }

      // Per-chapter first, then default fallback
      const farDef = byKey.get(farKey) || byKey.get('bg_default_far') || null;
      const midDef = byKey.get(midKey) || byKey.get('bg_default_mid') || null;
      const nearDef = byKey.get(nearKey) || byKey.get('bg_default_near') || null;

      bgDefCache.set(`${cacheKey}_far`, farDef as BackgroundRenderer.RenderDefinition);
      bgDefCache.set(`${cacheKey}_mid`, midDef as BackgroundRenderer.RenderDefinition);
      bgDefCache.set(`${cacheKey}_near`, nearDef as BackgroundRenderer.RenderDefinition);

      return {
        far: farDef as BackgroundRenderer.RenderDefinition | null,
        mid: midDef as BackgroundRenderer.RenderDefinition | null,
        near: nearDef as BackgroundRenderer.RenderDefinition | null,
      };
    }
  } catch { /* fall through to null */ }

  return { far: null, mid: null, near: null };
}

/** Render a procedural fallback gradient when asset data is unavailable. */
function renderFallback(width: number, height: number, chapterId: number, layer: 'far' | 'mid' | 'near'): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const hue = ((chapterId - 1) * 60) % 360;
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, `hsla(${hue}, 30%, 8%, 1)`);
  grad.addColorStop(1, `hsla(${hue + 30}, 30%, 4%, 1)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  if (layer === 'far') {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let i = 0; i < 30; i++) {
      const x = (Math.sin(i * 7.3 + chapterId) * 0.5 + 0.5) * width;
      const y = (Math.cos(i * 3.7 + chapterId) * 0.5 + 0.5) * height;
      ctx.beginPath();
      ctx.arc(x, y, 1 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return canvas;
}

const ParallaxBackground: React.FC<ParallaxBackgroundProps> = ({ width, height, chapterId, waveCount }) => {
  const [textures, setTextures] = useState<{
    far: Texture | null;
    mid: Texture | null;
    near: Texture | null;
  }>({ far: null, mid: null, near: null });

  const farOffset = useRef(0);
  const midOffset = useRef(0);
  const nearOffset = useRef(0);

  const targetFar = waveCount * 40;
  const targetMid = waveCount * 120;
  const targetNear = waveCount * 200;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Ensure component cache is loaded
      await backgroundComponentCache.load();

      const defs = await fetchLayerDefs(chapterId);
      if (cancelled) return;

      const cache = backgroundComponentCache;

      const makeTexture = (
        def: BackgroundRenderer.RenderDefinition | null,
        layer: 'far' | 'mid' | 'near',
      ): Texture => {
        const layerWidth = LAYER_WIDTHS[layer];
        if (def) {
          const result = BackgroundRenderer.render(
            { ...def, width: layerWidth, height },
            cache,
          );
          return Texture.from(result.canvas);
        }
        return Texture.from(renderFallback(layerWidth, height, chapterId, layer));
      };

      setTextures({
        far: makeTexture(defs.far, 'far'),
        mid: makeTexture(defs.mid, 'mid'),
        near: makeTexture(defs.near, 'near'),
      });
    };

    load().catch(err => {
      console.error('Failed to load parallax backgrounds:', err);
    });

    return () => { cancelled = true; };
  }, [chapterId, height]);

  useTick((delta) => {
    const dt = delta.deltaTime;
    farOffset.current += (targetFar - farOffset.current) * 0.05 * dt;
    midOffset.current += (targetMid - midOffset.current) * 0.08 * dt;
    nearOffset.current += (targetNear - nearOffset.current) * 0.12 * dt;
  });

  if (!textures.far || !textures.mid) return null;

  const farScale = textures.far.height ? height / textures.far.height : 1;
  const midScale = textures.mid.height ? height / textures.mid.height : 1;
  const nearScale = textures.near?.height ? height / textures.near.height : 1;

  return (
    <pixiContainer>
      <pixiTilingSprite
        texture={textures.far}
        width={width}
        height={height}
        tilePosition={{ x: -farOffset.current, y: 0 }}
        tileScale={{ x: farScale, y: farScale }}
        alpha={0.7}
      />
      <pixiTilingSprite
        texture={textures.mid}
        width={width}
        height={height}
        tilePosition={{ x: -midOffset.current, y: 0 }}
        tileScale={{ x: midScale, y: midScale }}
        alpha={0.9}
      />
      {textures.near && (
        <pixiTilingSprite
          texture={textures.near}
          width={width}
          height={height}
          tilePosition={{ x: -nearOffset.current, y: 0 }}
          tileScale={{ x: nearScale, y: nearScale }}
          alpha={0.85}
        />
      )}
    </pixiContainer>
  );
};

export default ParallaxBackground;
