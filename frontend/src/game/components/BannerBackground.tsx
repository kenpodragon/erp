import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useTick, extend } from '@pixi/react';
import { Assets, Texture, TilingSprite, Container, Graphics } from 'pixi.js';

// Register elements for v8
extend({ TilingSprite, Container, Graphics });

interface BannerBackgroundProps {
  chapterId: number;
  scrollSpeed: number;
  width: number;
  height: number;
}

/**
 * Handles infinite parallax layers with cross-fade transitions between chapters.
 */
const BannerBackground: React.FC<BannerBackgroundProps> = ({ chapterId, scrollSpeed, width, height }) => {
  const [textures, setTextures] = useState<Record<string, Texture>>({});
  const [currentChapter, setCurrentChapter] = useState(chapterId);
  const [nextChapter, setNextChapter] = useState<number | null>(null);
  const [fadeAlpha, setFadeAlpha] = useState(1.0);

  const FAR_FACTOR = 0.1;
  const MID_FACTOR = 0.5;
  const BASE_SPEED = 2;

  // Load all background assets
  useEffect(() => {
    const loadBgs = async () => {
      const loaded: any = {};
      for (let i = 1; i <= 4; i++) {
        try {
          loaded[`bg_${i}_far`] = await Assets.load(`/assets/game/backgrounds/bg_${i}_far.png`);
          loaded[`bg_${i}_mid`] = await Assets.load(`/assets/game/backgrounds/bg_${i}_mid.png`);
        } catch (e) {
          console.error(`Banner: Failed to load background ${i}`, e);
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
    const tex = textures[`bg_${chId}_${type}`];
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
