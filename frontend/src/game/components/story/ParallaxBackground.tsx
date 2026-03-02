import React, { useRef } from 'react';
import { useTick, extend } from '@pixi/react';
import { Assets, Texture, TilingSprite } from 'pixi.js';

// Register for v8 JSX
extend({ TilingSprite });

interface ParallaxBackgroundProps {
  width: number;
  height: number;
  chapterId: number;
  waveCount: number;
}

const ParallaxBackground: React.FC<ParallaxBackgroundProps> = ({ width, height, chapterId, waveCount }) => {
  const [textures, setTextures] = React.useState<{ far: Texture | null; mid: Texture | null }>({ far: null, mid: null });
  
  const farOffset = useRef(0);
  const midOffset = useRef(0);
  
  const targetFar = waveCount * 40;
  const targetMid = waveCount * 120;

  React.useEffect(() => {
    const bgNum = ((chapterId - 1) % 4) + 1;
    const farPath = `/assets/game/backgrounds/bg_${bgNum}_far.png`;
    const midPath = `/assets/game/backgrounds/bg_${bgNum}_mid.png`;

    Promise.all([
      Assets.load(farPath),
      Assets.load(midPath)
    ]).then(([farTex, midTex]) => {
      setTextures({ far: farTex, mid: midTex });
    }).catch(err => {
      console.error("Failed to load parallax backgrounds:", err);
    });
  }, [chapterId]);

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
