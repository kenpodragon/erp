import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useTick, extend } from '@pixi/react';
import { Texture, TilingSprite, Container, Graphics } from 'pixi.js';
import { api } from '../../api';
import * as BackgroundRenderer from '../renderers/BackgroundRenderer';

// Register elements for v8
extend({ TilingSprite, Container, Graphics });

interface BannerBackgroundProps {
  chapterId: number;
  scrollSpeed: number;
  width: number;
  height: number;
}

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
function renderFallbackBg(width: number, height: number, chapterId: number, layer: 'far' | 'mid'): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas; // Test environment — return blank canvas

  // Dark gradient fallback
  const hue = ((chapterId - 1) * 60) % 360;
  const alpha = layer === 'far' ? '0.3' : '0.5';
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, `hsla(${hue}, 30%, 8%, 1)`);
  grad.addColorStop(1, `hsla(${hue + 30}, 30%, 4%, 1)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Add some stars for the far layer
  if (layer === 'far') {
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
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

/**
 * Handles infinite parallax layers with cross-fade transitions between chapters.
 * Uses procedural rendering from the Asset Registry instead of filesystem PNGs.
 */
const BannerBackground: React.FC<BannerBackgroundProps> = ({ chapterId, scrollSpeed, width, height }) => {
  const [textures, setTextures] = useState<Record<string, Texture>>({});
  const [currentChapter, setCurrentChapter] = useState(chapterId);
  const [nextChapter, setNextChapter] = useState<number | null>(null);
  const [fadeAlpha, setFadeAlpha] = useState(1.0);

  const FAR_FACTOR = 0.1;
  const MID_FACTOR = 0.5;
  const BASE_SPEED = 2;

  // Load backgrounds from asset registry
  useEffect(() => {
    const loadBgs = async () => {
      const loaded: Record<string, Texture> = {};
      for (let i = 1; i <= 4; i++) {
        for (const layer of ['far', 'mid'] as const) {
          const assetKey = `bg_ch${i}_${layer}`;
          const def = await fetchBgDefinition(assetKey);
          let canvas: HTMLCanvasElement;

          if (def) {
            const renderDef = { ...def, width: 512, height: 150 };
            const result = BackgroundRenderer.render(renderDef);
            canvas = result.canvas;
          } else {
            canvas = renderFallbackBg(512, 150, i, layer);
          }

          loaded[assetKey] = Texture.from(canvas);
        }
      }
      setTextures(loaded);
    };
    loadBgs();
  }, []);

  // Handle Chapter Changes (Trigger Fade)
  useEffect(() => {
    if (chapterId !== currentChapter) {
      setNextChapter(chapterId);
      setFadeAlpha(0);
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

  const renderLayer = (chId: number, type: 'far' | 'mid', alpha: number) => {
    const tex = textures[`bg_ch${chId}_${type}`];
    if (!tex) return null;
    const factor = type === 'far' ? FAR_FACTOR : MID_FACTOR;
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
      </pixiContainer>

      {/* Next Chapter (Fading In) */}
      {nextChapter !== null && (
        <pixiContainer zIndex={1}>
          {renderLayer(nextChapter, 'far', fadeAlpha)}
          {renderLayer(nextChapter, 'mid', fadeAlpha)}
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
