import React, { useMemo } from 'react';
import { Application, extend } from '@pixi/react';
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import './BottomAnimatedBanner.css';

// Register Pixi elements for use in React JSX
extend({ Container, Graphics, Text });

const BottomAnimatedBanner: React.FC = () => {
  const width = window.innerWidth;
  const height = 120;

  // PixiJS Text Style
  const textStyle = useMemo(() => new TextStyle({
    fontFamily: 'Arial',
    fontSize: 14,
    fill: '#888',
    fontWeight: 'bold',
  }), []);

  return (
    <div className="bottom-banner-container">
      <Application width={width} height={height} background="#111111" antialias={true}>
        <pixiContainer x={0} y={0}>
          {/* Background Placeholder - Side Scrolling Simulation */}
          <pixiGraphics
            draw={(g) => {
              g.clear();
              g.fill(0x1a1a1a);
              g.rect(0, height - 20, width, 20); // Ground
            }}
          />

          {/* Player Placeholder - Rectangle (as requested) */}
          <pixiContainer x={width / 2} y={height - 60}>
            <pixiGraphics
              draw={(g) => {
                g.clear();
                g.fill(0x60a5fa); // Class color placeholder (e.g., Engineer)
                g.rect(-15, -15, 30, 30);
              }}
            />
            <pixiText text="PLAYER" x={-25} y={-35} style={textStyle} />
          </pixiContainer>

          {/* Enemy Placeholder - Rectangle scrolling past */}
          <pixiContainer x={width * 0.8} y={height - 60}>
            <pixiGraphics
              draw={(g) => {
                g.clear();
                g.fill(0xf87171); // Enemy color placeholder
                g.rect(-10, -10, 20, 20);
              }}
            />
            <pixiText text="ENEMY" x={-20} y={-30} style={textStyle} />
          </pixiContainer>

          {/* Info Text */}
          <pixiText 
            text="PIXI.JS v8 RENDERER ACTIVE - OVERWORLD BATTLE ANIMATION" 
            x={10} 
            y={10} 
            style={textStyle} 
          />
        </pixiContainer>
      </Application>
    </div>
  );
};

export default BottomAnimatedBanner;
