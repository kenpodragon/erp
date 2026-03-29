import React, { useRef, useState, useEffect } from 'react';
import { useTick, extend } from '@pixi/react';
import { Texture, TilingSprite, Container, Graphics } from 'pixi.js';
import { api } from '../../api';
import * as BackgroundRenderer from '../renderers/BackgroundRenderer';
import { backgroundComponentCache } from '../renderers/BackgroundComponentCache';

// Register elements for v8
extend({ TilingSprite, Container, Graphics });

interface BannerBackgroundProps {
  chapterId: number;
  scrollSpeed: number;
  width: number;
  height: number;
}

/** Canvas widths per layer — mismatched to hide tiling seams. */
const LAYER_WIDTHS = { far: 2048, mid: 1536, near: 1024 } as const;
const LAYER_HEIGHT = 150;

type LayerName = 'far' | 'mid' | 'near';
const LAYERS: LayerName[] = ['far', 'mid', 'near'];

/** Module-level cache for background definitions from the asset registry. */
const bgDefCache = new Map<string, BackgroundRenderer.RenderDefinition>();
const bgDefFailed = new Set<string>();
const bgDefPending = new Map<string, Promise<BackgroundRenderer.RenderDefinition | null>>();

async function fetchBgDefinition(assetKey: string): Promise<BackgroundRenderer.RenderDefinition | null> {
  if (bgDefCache.has(assetKey)) return bgDefCache.get(assetKey)!;
  if (bgDefFailed.has(assetKey)) return null;
  if (bgDefPending.has(assetKey)) return bgDefPending.get(assetKey)!;

  const promise = (async () => {
    try {
      const res = await api.get(`/api/game/assets/batch?keys=${encodeURIComponent(assetKey)}`);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.items || []);
        const match = items.find((i: any) => i.asset_key === assetKey);
        if (match?.render_definition) {
          bgDefCache.set(assetKey, match.render_definition);
          return match.render_definition as BackgroundRenderer.RenderDefinition;
        }
      }
      bgDefFailed.add(assetKey);
      return null;
    } catch {
      return null;
    } finally {
      bgDefPending.delete(assetKey);
    }
  })();

  bgDefPending.set(assetKey, promise);
  return promise;
}

/** Render a procedural fallback gradient background. */
function renderFallbackBg(width: number, height: number, chapterId: number, layer: LayerName): HTMLCanvasElement {
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

/** Load textures for a single chapter (all 3 layers).
 *  Falls back to bg_default_far/mid/near when per-chapter assets aren't populated. */
async function loadChapterTextures(chapterId: number): Promise<Record<string, Texture>> {
  await backgroundComponentCache.load();
  const cache = backgroundComponentCache;
  const loaded: Record<string, Texture> = {};

  // Per-chapter keys + default fallback keys
  const chapterKeys = LAYERS.map(l => `bg_ch${chapterId}_${l}`);
  const defaultKeys = LAYERS.map(l => `bg_default_${l}`);
  const allKeysToFetch = [...new Set([...chapterKeys, ...defaultKeys])].filter(
    k => !bgDefCache.has(k) && !bgDefFailed.has(k),
  );

  if (allKeysToFetch.length > 0) {
    try {
      const res = await api.get(`/api/game/assets/batch?keys=${encodeURIComponent(allKeysToFetch.join(','))}`);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.items || []);
        const byKey = new Map(items.map((i: any) => [i.asset_key, i.render_definition]));
        for (const key of allKeysToFetch) {
          if (byKey.has(key)) {
            bgDefCache.set(key, byKey.get(key) as BackgroundRenderer.RenderDefinition);
          } else {
            bgDefFailed.add(key);
          }
        }
      }
    } catch { /* fall through to fallback */ }
  }

  for (const layer of LAYERS) {
    const assetKey = `bg_ch${chapterId}_${layer}`;
    const defaultKey = `bg_default_${layer}`;
    const def = bgDefCache.get(assetKey) || bgDefCache.get(defaultKey) || null;
    const layerWidth = LAYER_WIDTHS[layer];

    let canvas: HTMLCanvasElement;
    if (def) {
      const result = BackgroundRenderer.render(
        { ...def, width: layerWidth, height: LAYER_HEIGHT },
        cache,
      );
      canvas = result.canvas;
    } else {
      canvas = renderFallbackBg(layerWidth, LAYER_HEIGHT, chapterId, layer);
    }
    loaded[`${chapterId}_${layer}`] = Texture.from(canvas);
  }

  return loaded;
}

const BannerBackground: React.FC<BannerBackgroundProps> = ({ chapterId, scrollSpeed, width, height }) => {
  const [textures, setTextures] = useState<Record<string, Texture>>({});
  const [currentChapter, setCurrentChapter] = useState(chapterId);
  const [nextChapter, setNextChapter] = useState<number | null>(null);
  const [fadeAlpha, setFadeAlpha] = useState(1.0);

  const FAR_FACTOR = 0.1;
  const MID_FACTOR = 0.5;
  const NEAR_FACTOR = 0.9;
  const BASE_SPEED = 2;

  // Load backgrounds for current chapter
  useEffect(() => {
    loadChapterTextures(chapterId).then(loaded => {
      setTextures(prev => ({ ...prev, ...loaded }));
    });
  }, []);

  // Handle Chapter Changes (Trigger Fade)
  useEffect(() => {
    if (chapterId !== currentChapter) {
      // Pre-load next chapter textures, then start fade
      loadChapterTextures(chapterId).then(loaded => {
        setTextures(prev => ({ ...prev, ...loaded }));
        setNextChapter(chapterId);
        setFadeAlpha(0);
      });
    }
  }, [chapterId, currentChapter]);

  useTick((delta) => {
    const dt = delta.deltaTime;
    if (nextChapter !== null) {
      setFadeAlpha(prev => {
        const next = prev + (0.02 * dt);
        if (next >= 1.0) {
          setCurrentChapter(nextChapter);
          setNextChapter(null);
          return 1.0;
        }
        return next;
      });
    }
  });

  const scrollRef = useRef(0);
  useTick((delta) => {
    scrollRef.current -= scrollSpeed * delta.deltaTime * BASE_SPEED;
  });

  if (Object.keys(textures).length === 0) return null;

  const renderLayer = (chId: number, type: LayerName, alpha: number) => {
    const tex = textures[`${chId}_${type}`];
    if (!tex) return null;
    const factor = type === 'far' ? FAR_FACTOR : type === 'mid' ? MID_FACTOR : NEAR_FACTOR;
    return (
      <pixiTilingSprite
        texture={tex}
        width={width}
        height={height}
        tilePosition={{ x: scrollRef.current * factor, y: 0 }}
        alpha={alpha}
      />
    );
  };

  return (
    <pixiContainer sortableChildren={true}>
      {/* Current Chapter Layers */}
      <pixiContainer zIndex={0}>
        {renderLayer(currentChapter, 'far', 1.0)}
        {renderLayer(currentChapter, 'mid', 1.0)}
        {renderLayer(currentChapter, 'near', 1.0)}
      </pixiContainer>

      {/* Next Chapter (Fading In) */}
      {nextChapter !== null && (
        <pixiContainer zIndex={1}>
          {renderLayer(nextChapter, 'far', fadeAlpha)}
          {renderLayer(nextChapter, 'mid', fadeAlpha)}
          {renderLayer(nextChapter, 'near', fadeAlpha)}
        </pixiContainer>
      )}

      {/* Solid Ground Layer */}
      <pixiGraphics
        zIndex={2}
        draw={(g) => {
          g.clear().rect(0, 75, width, 75).fill({ color: 0x1a1a1a });
          g.stroke({ width: 2, color: 0x333333 });
        }}
      />
    </pixiContainer>
  );
};

export default BannerBackground;
