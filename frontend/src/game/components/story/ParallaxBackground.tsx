import React, { useRef } from 'react';
import { useTick } from '@pixi/react';
import { Assets, Texture } from 'pixi.js';

interface ParallaxBackgroundProps {
  width: number;
  height: number;
  chapterId: number;
  waveCount: number;
}

const ParallaxBackground: React.FC<ParallaxBackgroundProps> = ({ width, height, chapterId, waveCount }) => {
  const [textures, setTextures] = React.useState<{ far: Texture | null; mid: Texture | null }>({ far: null, mid: null });
  
  // Track scroll offsets
  const farOffset = useRef(0);
  const midOffset = useRef(0);
  
  // target offsets based on waveCount
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

  return (
    <>
      {/* Far Layer */}
      {textures.far && (
        <pixiTilingSprite
          texture={textures.far}
          width={width}
          height={height}
          tilePosition={{ x: -farOffset.current, y: 0 }}
          tileScale={{ x: height / textures.far.height, y: height / textures.far.height }}
          alpha={0.7}
        />
      )}
      
      {/* Mid Layer */}
      {textures.mid && (
        <pixiTilingSprite
          texture={textures.mid}
          width={width}
          height={height}
          tilePosition={{ x: -midOffset.current, y: 0 }}
          tileScale={{ x: height / textures.mid.height, y: height / textures.mid.height }}
          alpha={0.9}
        />
      )}
    </>
  );
};

export default ParallaxBackground;
