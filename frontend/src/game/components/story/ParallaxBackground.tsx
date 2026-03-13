import React, { useRef, useState, useEffect } from 'react';
import { useTick, extend } from '@pixi/react';
import { Texture, TilingSprite } from 'pixi.js';
import { api } from '../../../api';
import * as BackgroundRenderer from '../../renderers/BackgroundRenderer';

// Register for v8 JSX
extend({ TilingSprite });

interface ParallaxBackgroundProps {
  width: number;
  height: number;
  chapterId: number;
  waveCount: number;
}

/** Module-level cache for background definitions. */
const bgDefCache = new Map<string, BackgroundRenderer.RenderDefinition>();
const bgDefFailed = new Set<string>();

async function fetchBgDef(assetKey: string): Promise<BackgroundRenderer.RenderDefinition | null> {
  if (bgDefCache.has(assetKey)) return bgDefCache.get(assetKey)!;
  if (bgDefFailed.has(assetKey)) return null;

  try {
    const res = await api.get(`/api/admin/assets/batch?keys=${encodeURIComponent(assetKey)}`);
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
  }
}

/** Render a procedural fallback gradient. */
function renderFallback(width: number, height: number, chapterId: number, layer: 'far' | 'mid'): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas; // Test environment — return blank canvas

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
  const [textures, setTextures] = useState<{ far: Texture | null; mid: Texture | null }>({ far: null, mid: null });

  const farOffset = useRef(0);
  const midOffset = useRef(0);

  const targetFar = waveCount * 40;
  const targetMid = waveCount * 120;

  useEffect(() => {
    const bgNum = ((chapterId - 1) % 4) + 1;

    const load = async () => {
      const farKey = `bg_${bgNum}_far`;
      const midKey = `bg_${bgNum}_mid`;

      const [farDef, midDef] = await Promise.all([
        fetchBgDef(farKey),
        fetchBgDef(midKey),
      ]);

      let farCanvas: HTMLCanvasElement;
      if (farDef) {
        const result = BackgroundRenderer.render({ ...farDef, width: 512, height });
        farCanvas = result.canvas;
      } else {
        farCanvas = renderFallback(512, height, bgNum, 'far');
      }

      let midCanvas: HTMLCanvasElement;
      if (midDef) {
        const result = BackgroundRenderer.render({ ...midDef, width: 512, height });
        midCanvas = result.canvas;
      } else {
        midCanvas = renderFallback(512, height, bgNum, 'mid');
      }

      setTextures({
        far: Texture.from(farCanvas),
        mid: Texture.from(midCanvas),
      });
    };

    load().catch(err => {
      console.error("Failed to load parallax backgrounds:", err);
    });
  }, [chapterId, height]);

  useTick((delta) => {
    const dt = delta.deltaTime;
    farOffset.current += (targetFar - farOffset.current) * 0.05 * dt;
    midOffset.current += (targetMid - midOffset.current) * 0.08 * dt;
  });

  if (!textures.far || !textures.mid) return null;

  // Use a safe scale factor. If texture is missing dimensions, fallback to 1.
  const farScale = textures.far.height ? height / textures.far.height : 1;
  const midScale = textures.mid.height ? height / textures.mid.height : 1;

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
    </pixiContainer>
  );
};

export default ParallaxBackground;
