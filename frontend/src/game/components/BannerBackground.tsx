import React, { useMemo, useRef } from 'react';
import { useTick } from '@pixi/react';
import * as PIXI from 'pixi.js';

interface BannerBackgroundProps {
  chapterId: number;
  scrollSpeed: number; // 0 to 1
  width: number;
  height: number;
}

/**
 * Handles the infinite parallax scrolling layers for the Battle Banner.
 */
const BannerBackground: React.FC<BannerBackgroundProps> = ({ chapterId, scrollSpeed, width, height }) => {
  const farRef = useRef<PIXI.TilingSprite>(null);
  const midRef = useRef<PIXI.TilingSprite>(null);
  const groundRef = useRef<PIXI.TilingSprite>(null);

  const BASE_SPEED = 2;

  useTick((delta) => {
    const dt = delta.deltaTime;
    const effectiveSpeed = scrollSpeed * dt * BASE_SPEED;

    if (farRef.current) farRef.current.tilePosition.x -= effectiveSpeed * 0.1;
    if (midRef.current) midRef.current.tilePosition.x -= effectiveSpeed * 0.5;
    if (groundRef.current) groundRef.current.tilePosition.x -= effectiveSpeed * 1.0;
  });

  const colors = useMemo(() => {
    return {
      far: chapterId % 2 === 0 ? 0x0a0a1a : 0x1a0a0a,
      mid: chapterId % 2 === 0 ? 0x111122 : 0x221111,
      ground: 0x1a1a1a
    };
  }, [chapterId]);

  return (
    <pixiContainer>
      <pixiGraphics
        draw={(g) => {
          g.clear().rect(0, 0, width, height).fill({ color: colors.far });
        }}
      />

      <pixiGraphics
        draw={(g) => {
          g.clear().rect(0, 20, width, height - 95).fill({ color: colors.mid });
          g.stroke({ width: 1, color: 0x333333 });
          for (let i = 0; i < width; i += 100) {
            g.moveTo(i, 20);
            g.lineTo(i, 75);
          }
        }}
      />

      <pixiGraphics
        draw={(g) => {
          g.clear().rect(0, 75, width, 75).fill({ color: colors.ground });
          g.stroke({ width: 2, color: 0x333333 });
        }}
      />
    </pixiContainer>
  );
};

export default BannerBackground;
