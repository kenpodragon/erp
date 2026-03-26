# Entity Family Body Plans — Watchdog v3

Each family has a defined SVG body plan. Individual entities VARY within the plan (colors, proportions, detail elements) but share the structural silhouette.

All SVGs: `viewBox="0 0 64 64"`, 64x64 game sprites.

---

## 1. MECHANISMS (842 entities)
- **Body type:** Biped/Orb hybrid — mechanical torso with gear-like joints
- **Primary silhouette:** biped (53) / orb (38) / quadruped (36)
- **Movement:** ground
- **Constant elements:** Angular torso with panel lines, glowing core/eye, joint articulations
- **Variable elements:** Arm count (1-4), weapon attachments, antenna/sensor arrays, rust level, glow color, panel pattern
- **Color guide:** Book 1: tarnished copper/dark iron. Book 2: oxidized green/bronze. Book 3: polished gold/silver
- **SVG structure:** `<defs>` with metallic gradient → body `<path>` (angular torso) → limb `<rect>`s with joint `<circle>`s → core `<ellipse>` with `<animate>` glow → detail lines/panels

### Example SVG (Mechanism — ground/biped/medium):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8a7d6b"/>
      <stop offset="100%" stop-color="#4a3d2b"/>
    </linearGradient>
  </defs>
  <path d="M24 18 L40 18 L42 32 L38 44 L26 44 L22 32 Z" fill="url(#metal)" stroke="#2a1d0b" stroke-width="0.5"/>
  <rect x="18" y="20" width="4" height="16" rx="2" fill="#6b5d4b" transform="rotate(-10 20 28)"/>
  <rect x="42" y="20" width="4" height="16" rx="2" fill="#6b5d4b" transform="rotate(10 44 28)"/>
  <rect x="26" y="44" width="5" height="14" rx="1" fill="#5a4d3b"/>
  <rect x="33" y="44" width="5" height="14" rx="1" fill="#5a4d3b"/>
  <circle cx="20" cy="20" r="2" fill="#3a3a3a"/>
  <circle cx="44" cy="20" r="2" fill="#3a3a3a"/>
  <ellipse cx="32" cy="26" rx="4" ry="3" fill="#ff6600" opacity="0.8">
    <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/>
  </ellipse>
  <path d="M28 14 L36 14 L38 18 L26 18 Z" fill="#7a6d5b"/>
  <line x1="28" y1="22" x2="28" y2="30" stroke="#2a1d0b" stroke-width="0.3"/>
  <line x1="36" y1="22" x2="36" y2="30" stroke="#2a1d0b" stroke-width="0.3"/>
  <circle cx="30" cy="16" r="1.5" fill="#ff4400">
    <animate attributeName="fill" values="#ff4400;#ff8800;#ff4400" dur="3s" repeatCount="indefinite"/>
  </circle>
</svg>
```

---

## 2. BEASTS (544 entities)
- **Body type:** Quadruped — four-legged creature with head, torso, tail
- **Primary silhouette:** quadruped (all sizes)
- **Movement:** ground
- **Constant elements:** 4 leg paths, elongated torso, head with snout/muzzle, tail
- **Variable elements:** Ear shape (pointed/round/absent), tail (long/short/spiked), horn count (0-3), fur texture (smooth/spiky paths), fang size, eye count (1-3), body ratio (slim/stocky)
- **Color guide:** Book 1: deep purple, dark blue, phosphorescent green eyes. Book 2: earthy brown, forest green, amber. Book 3: gold, ivory, celestial blue
- **SVG structure:** `<defs>` with fur gradient → body `<path>` (torso arc) → 4 leg `<path>`s → head `<path>` (snout) → ear `<path>`s → tail `<path>` → eye `<circle>` with glow `<animate>` → detail marks

### Example SVG (Beast — ground/quadruped/large):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="fur" cx="0.5" cy="0.4" r="0.5">
      <stop offset="0%" stop-color="#5a3d6b"/>
      <stop offset="100%" stop-color="#2a1d3b"/>
    </radialGradient>
  </defs>
  <path d="M12 30 Q16 18 32 16 Q48 18 52 30 Q50 38 44 40 L20 40 Q14 38 12 30 Z" fill="url(#fur)" stroke="#1a0d2b" stroke-width="0.5"/>
  <path d="M16 40 L14 56 L18 56 L22 40" fill="#4a2d5b" stroke="#1a0d2b" stroke-width="0.3"/>
  <path d="M26 40 L24 56 L28 56 L30 40" fill="#4a2d5b" stroke="#1a0d2b" stroke-width="0.3"/>
  <path d="M34 40 L32 56 L36 56 L38 40" fill="#4a2d5b" stroke="#1a0d2b" stroke-width="0.3"/>
  <path d="M42 40 L40 56 L44 56 L46 40" fill="#4a2d5b" stroke="#1a0d2b" stroke-width="0.3"/>
  <path d="M8 24 L4 18 L12 22 Z" fill="#5a3d6b"/>
  <path d="M10 20 L6 12 L8 14 L12 20" fill="#5a3d6b"/>
  <path d="M52 30 Q58 34 56 42 Q54 44 52 40" fill="#3a2d4b" stroke="#1a0d2b" stroke-width="0.3"/>
  <circle cx="10" cy="24" r="2" fill="#00ff88" opacity="0.9">
    <animate attributeName="r" values="1.8;2.2;1.8" dur="2.5s" repeatCount="indefinite"/>
  </circle>
  <path d="M6 28 L4 30 L8 29" fill="#3a1d4b"/>
  <animateTransform attributeName="transform" type="translate" values="0,0;0,-1;0,0" dur="4s" repeatCount="indefinite"/>
</svg>
```

---

## 3. PHANTASMS (509 entities)
- **Body type:** Floating wisp — amorphous ethereal form with trailing tendrils
- **Primary silhouette:** orb (hover/teleport)
- **Movement:** hover / teleport
- **Constant elements:** Central luminous core, wispy trailing paths, translucent layering, fade-edge effect
- **Variable elements:** Tendril count (2-6), core shape (round/angular/fractured), face features (hollow eyes/none/multiple), trail length, opacity pattern, color shimmer
- **Color guide:** Book 1: ghostly green, deep violet, cold blue. Book 2: misty gray, pale amber. Book 3: white-gold, prismatic
- **SVG structure:** `<defs>` with radial gradient (fade-to-transparent) → core `<ellipse>` → tendril `<path>`s with curves → face detail `<circle>`s (hollow eyes) → `<animate>` float + opacity pulse

### Example SVG (Phantasm — hover/orb/medium):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="ghost" cx="0.5" cy="0.4" r="0.6">
      <stop offset="0%" stop-color="#8866cc" stop-opacity="0.9"/>
      <stop offset="70%" stop-color="#5533aa" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#331177" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="32" cy="24" rx="14" ry="12" fill="url(#ghost)">
    <animate attributeName="ry" values="11;13;11" dur="3s" repeatCount="indefinite"/>
  </ellipse>
  <path d="M20 30 Q18 44 22 52 Q24 54 26 48 Q28 56 30 46" fill="#5533aa" opacity="0.5"/>
  <path d="M34 30 Q36 50 38 54 Q40 52 40 44 Q42 56 44 48" fill="#5533aa" opacity="0.4"/>
  <path d="M26 32 Q24 42 20 50" fill="none" stroke="#7755cc" stroke-width="1" opacity="0.3"/>
  <circle cx="27" cy="22" r="3" fill="#110033" opacity="0.8"/>
  <circle cx="37" cy="22" r="3" fill="#110033" opacity="0.8"/>
  <circle cx="27" cy="22" r="1" fill="#cc88ff">
    <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite"/>
  </circle>
  <circle cx="37" cy="22" r="1" fill="#cc88ff">
    <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" begin="0.5s"/>
  </circle>
  <path d="M28 28 Q32 32 36 28" fill="none" stroke="#331177" stroke-width="0.5" opacity="0.6"/>
  <animateTransform attributeName="transform" type="translate" values="0,0;0,-3;0,0" dur="4s" repeatCount="indefinite"/>
</svg>
```

---

## 4. ELEMENTALS (507 entities)
- **Body type:** Elemental orb — swirling energy core with radiating particles/arcs
- **Primary silhouette:** orb (hover/flying)
- **Movement:** hover / flying
- **Constant elements:** Central energy mass, radiating energy arcs/rays, particle effects, dynamic motion
- **Variable elements:** Element type (fire/ice/lightning/earth/void), particle shape, arc count, intensity, corona size, inner pattern
- **Color guide:** Book 1: crystal blue, molten orange, void purple. Book 2: leaf green, storm gray, amber. Book 3: solar gold, pure white, prismatic
- **SVG structure:** `<defs>` with radial gradient → core `<circle>` → energy arc `<path>`s (curved) → particle `<circle>`s with `<animate>` scatter → corona `<ellipse>` with opacity pulse

### Example SVG (Elemental — hover/orb/medium):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="energy" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#ffdd44"/>
      <stop offset="50%" stop-color="#ff6600"/>
      <stop offset="100%" stop-color="#cc2200" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="32" cy="32" rx="18" ry="18" fill="url(#energy)" opacity="0.3">
    <animate attributeName="rx" values="16;20;16" dur="2s" repeatCount="indefinite"/>
  </ellipse>
  <circle cx="32" cy="32" r="10" fill="#ff8800" stroke="#ffcc00" stroke-width="1">
    <animate attributeName="r" values="9;11;9" dur="1.5s" repeatCount="indefinite"/>
  </circle>
  <path d="M32 20 Q38 14 44 18" fill="none" stroke="#ffdd44" stroke-width="1.5" opacity="0.8"/>
  <path d="M32 20 Q26 12 18 16" fill="none" stroke="#ffdd44" stroke-width="1.5" opacity="0.7"/>
  <path d="M44 32 Q50 38 46 44" fill="none" stroke="#ff9900" stroke-width="1" opacity="0.6"/>
  <path d="M20 32 Q14 26 18 20" fill="none" stroke="#ff9900" stroke-width="1" opacity="0.6"/>
  <circle cx="40" cy="20" r="2" fill="#ffee66" opacity="0.7">
    <animate attributeName="cy" values="20;16;20" dur="2.5s" repeatCount="indefinite"/>
  </circle>
  <circle cx="22" cy="42" r="1.5" fill="#ffcc44" opacity="0.5">
    <animate attributeName="cx" values="22;18;22" dur="3s" repeatCount="indefinite"/>
  </circle>
  <circle cx="42" cy="40" r="1" fill="#ffee88">
    <animate attributeName="opacity" values="0.3;1;0.3" dur="1.8s" repeatCount="indefinite"/>
  </circle>
  <path d="M28 28 Q32 24 36 28 Q32 32 28 28" fill="#ffcc00" opacity="0.6"/>
</svg>
```

---

## 5. COLLECTIVES (455 entities)
- **Body type:** Cluster/swarm — multiple small forms grouped together
- **Primary silhouette:** cluster (ground/flying)
- **Movement:** ground / flying
- **Constant elements:** 3-7 small individual shapes clustered, connecting lines/energy, shared boundary/aura
- **Variable elements:** Individual shape (humanoid mini/insect/orb/shard), cluster density, formation (tight/loose/ring), connecting element type, count of individuals
- **Color guide:** Book 1: dark gray-purple swarm. Book 2: earthy brown-green pack. Book 3: gold-white formation
- **SVG structure:** `<defs>` with shared gradient → 3-5 individual `<path>` shapes at different positions → connecting `<line>`s or `<path>` energy → outer boundary `<ellipse>` (faint) → `<animate>` on individuals for swarm motion

### Example SVG (Collective — ground/cluster/small):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="swarm" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6b4a3a"/>
      <stop offset="100%" stop-color="#3a2a1a"/>
    </linearGradient>
  </defs>
  <ellipse cx="32" cy="36" rx="22" ry="16" fill="none" stroke="#4a3a2a" stroke-width="0.5" opacity="0.3"/>
  <path d="M20 32 L18 28 L22 26 L24 30 Z" fill="url(#swarm)">
    <animateTransform attributeName="transform" type="translate" values="0,0;-1,1;0,0" dur="2s" repeatCount="indefinite"/>
  </path>
  <path d="M30 28 L28 24 L32 22 L34 26 Z" fill="#5a3a2a">
    <animateTransform attributeName="transform" type="translate" values="0,0;1,-1;0,0" dur="2.2s" repeatCount="indefinite"/>
  </path>
  <path d="M40 34 L38 30 L42 28 L44 32 Z" fill="url(#swarm)">
    <animateTransform attributeName="transform" type="translate" values="0,0;-1,-1;0,0" dur="1.8s" repeatCount="indefinite"/>
  </path>
  <path d="M26 40 L24 36 L28 34 L30 38 Z" fill="#4a2a1a">
    <animateTransform attributeName="transform" type="translate" values="0,0;1,1;0,0" dur="2.5s" repeatCount="indefinite"/>
  </path>
  <path d="M36 42 L34 38 L38 36 L40 40 Z" fill="#5a3a2a">
    <animateTransform attributeName="transform" type="translate" values="0,0;-1,0;0,0" dur="2.1s" repeatCount="indefinite"/>
  </path>
  <line x1="22" y1="30" x2="30" y2="26" stroke="#8a6a4a" stroke-width="0.3" opacity="0.4"/>
  <line x1="34" y1="26" x2="42" y2="32" stroke="#8a6a4a" stroke-width="0.3" opacity="0.4"/>
  <line x1="28" y1="38" x2="38" y2="40" stroke="#8a6a4a" stroke-width="0.3" opacity="0.4"/>
  <circle cx="32" cy="34" r="2" fill="#ff8844" opacity="0.5">
    <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3s" repeatCount="indefinite"/>
  </circle>
</svg>
```

---

## 6. HUMANOIDS (388 entities)
- **Body type:** Biped — upright figure with head, torso, 2 arms, 2 legs
- **Primary silhouette:** biped (ground)
- **Movement:** ground / teleport
- **Constant elements:** Head circle/oval, torso trapezoid, 2 arm paths, 2 leg paths, shoulder line
- **Variable elements:** Weapon/tool in hand, armor style, head gear (hood/crown/horns/none), cloak/cape, facial features, height ratio, stance (aggressive/passive/robed)
- **Color guide:** Book 1: dark robes, pale skin, shadowed. Book 2: leather/cloth, tanned. Book 3: white/gold armor, radiant
- **SVG structure:** `<defs>` with cloth/skin gradient → head `<circle>` → torso `<path>` → arm `<path>`s → leg `<path>`s → weapon/detail `<path>` → eye `<circle>`s → `<animate>` on weapon or stance

### Example SVG (Humanoid — ground/biped/medium):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="robe" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3a3a5a"/>
      <stop offset="100%" stop-color="#1a1a2a"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="14" r="6" fill="#c4a882"/>
  <path d="M26 20 L22 20 L20 38 L28 40 L32 42 L36 40 L44 38 L42 20 L38 20 Z" fill="url(#robe)"/>
  <path d="M20 24 L12 34 L14 36 L22 30" fill="#2a2a4a" stroke="#1a1a2a" stroke-width="0.3"/>
  <path d="M44 24 L52 34 L50 36 L42 30" fill="#2a2a4a" stroke="#1a1a2a" stroke-width="0.3"/>
  <path d="M26 40 L24 58 L28 58 L30 42" fill="#1a1a2a"/>
  <path d="M38 40 L36 58 L40 58 L42 42" fill="#1a1a2a"/>
  <circle cx="30" cy="13" r="1" fill="#446688"/>
  <circle cx="34" cy="13" r="1" fill="#446688"/>
  <path d="M12 34 L8 30 L6 32 L10 36" fill="#8a7a6a" stroke="#5a4a3a" stroke-width="0.5"/>
  <ellipse cx="32" cy="10" rx="7" ry="3" fill="#2a2a4a" opacity="0.8"/>
  <path d="M29 16 L32 18 L35 16" fill="none" stroke="#8a6a5a" stroke-width="0.3"/>
  <animate attributeName="opacity" values="1;0.95;1" dur="4s" repeatCount="indefinite"/>
</svg>
```

---

## 7. TERRAINS (308 entities)
- **Body type:** Amorphous mass — landscape-like blob with environmental features
- **Primary silhouette:** blob (ground, huge/large)
- **Movement:** ground
- **Constant elements:** Irregular organic mass, surface texture, embedded features (crystals/roots/eyes), ground-merging base
- **Variable elements:** Surface type (rocky/muddy/crystalline/mossy/volcanic), embedded object count, eye/mouth placement, height, spread, terrain features
- **Color guide:** Book 1: dark stone, crystal teal, cave shadow. Book 2: mossy green, muddy brown. Book 3: marble white, golden veined
- **SVG structure:** `<defs>` with terrain gradient → main mass `<path>` (irregular blob) → surface texture `<path>`s → embedded features (`<polygon>` crystals, `<circle>` eyes, `<path>` roots) → `<animate>` slow pulse/shift

### Example SVG (Terrain — ground/blob/huge):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="rock" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="#4a5a4a"/>
      <stop offset="100%" stop-color="#2a3a2a"/>
    </linearGradient>
  </defs>
  <path d="M4 50 Q8 30 16 26 Q24 20 32 18 Q44 20 50 28 Q58 36 60 50 Q50 56 32 58 Q14 56 4 50 Z" fill="url(#rock)" stroke="#1a2a1a" stroke-width="0.5"/>
  <path d="M16 28 Q20 24 24 28 Q22 32 18 30" fill="#3a4a3a" opacity="0.6"/>
  <path d="M40 26 Q46 22 50 28 Q48 32 42 30" fill="#3a4a3a" opacity="0.5"/>
  <polygon points="22,22 24,14 26,22" fill="#44ccaa" opacity="0.7"/>
  <polygon points="36,20 38,10 40,20" fill="#33bbaa" opacity="0.8"/>
  <polygon points="44,24 45,16 47,24" fill="#44ccaa" opacity="0.6"/>
  <circle cx="28" cy="34" r="2.5" fill="#220000" opacity="0.7"/>
  <circle cx="28" cy="34" r="1" fill="#ff4444">
    <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite"/>
  </circle>
  <circle cx="42" cy="36" r="2" fill="#220000" opacity="0.7"/>
  <circle cx="42" cy="36" r="0.8" fill="#ff4444">
    <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite" begin="1s"/>
  </circle>
  <path d="M10 48 Q8 44 12 40" fill="none" stroke="#5a3a2a" stroke-width="1.5" opacity="0.4"/>
  <path d="M50 46 Q54 42 52 38" fill="none" stroke="#5a3a2a" stroke-width="1.5" opacity="0.4"/>
</svg>
```

---

## 8. CHRONICLES (220 entities)
- **Body type:** Temporal orb — clock/hourglass-like shape with time distortion effects
- **Primary silhouette:** orb (hover/teleport)
- **Movement:** hover / teleport
- **Constant elements:** Central temporal shape (hourglass/clock/spiral), time-fracture lines, echo/afterimage effect
- **Variable elements:** Core shape (hourglass/spiral/clock face/shattered), fracture pattern, echo count, color shift direction, time symbols
- **Color guide:** Book 1: deep bronze/amber. Book 2: quicksilver/gray. Book 3: golden/white-hot
- **SVG structure:** `<defs>` with time gradient → central shape `<path>` (hourglass/spiral) → fracture `<line>`s radiating → echo `<ellipse>`s (faded copies) → clock symbols → `<animate>` rotation/pulse

### Example SVG (Chronicle — hover/orb/small):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="time" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#ffcc66"/>
      <stop offset="100%" stop-color="#885522" stop-opacity="0.2"/>
    </radialGradient>
  </defs>
  <ellipse cx="32" cy="32" rx="16" ry="16" fill="url(#time)" opacity="0.3"/>
  <path d="M26 18 L38 18 L34 30 L38 30 L38 46 L26 46 L30 34 L26 34 Z" fill="#cc9933" stroke="#aa7722" stroke-width="0.5">
    <animateTransform attributeName="transform" type="rotate" values="0 32 32;5 32 32;0 32 32;-5 32 32;0 32 32" dur="6s" repeatCount="indefinite"/>
  </path>
  <circle cx="32" cy="32" r="12" fill="none" stroke="#ddaa44" stroke-width="0.5" stroke-dasharray="2,2">
    <animateTransform attributeName="transform" type="rotate" values="0 32 32;360 32 32" dur="10s" repeatCount="indefinite"/>
  </circle>
  <line x1="32" y1="20" x2="32" y2="16" stroke="#ffdd66" stroke-width="1"/>
  <line x1="32" y1="48" x2="32" y2="44" stroke="#ffdd66" stroke-width="1"/>
  <line x1="16" y1="32" x2="20" y2="32" stroke="#ffdd66" stroke-width="1"/>
  <line x1="48" y1="32" x2="44" y2="32" stroke="#ffdd66" stroke-width="1"/>
  <ellipse cx="32" cy="32" rx="14" ry="14" fill="none" stroke="#cc9933" stroke-width="0.3" opacity="0.4">
    <animate attributeName="rx" values="14;18;14" dur="4s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.4;0.1;0.4" dur="4s" repeatCount="indefinite"/>
  </ellipse>
  <circle cx="32" cy="24" r="1.5" fill="#ffee88"/>
</svg>
```

---

## 9. ABERRATIONS (72 entities)
- **Body type:** Eldritch horror — asymmetric, wrong-geometry, tentacled mass
- **Primary silhouette:** mixed (blob/cluster, hover/teleport/burrowing)
- **Movement:** hover / teleport / burrowing
- **Constant elements:** Asymmetric mass, tentacles/pseudopods, multiple eyes at wrong angles, geometry-defying edges
- **Variable elements:** Tentacle count (3-8), eye count (1-7), body asymmetry, mouth shape (if any), surface texture, dimensional crack effects
- **Color guide:** Book 1: void black, sick green. Book 2: bruise purple, bile yellow. Book 3: anti-light (dark with bright cracks)
- **SVG structure:** `<defs>` with void gradient → asymmetric body `<path>` → tentacle `<path>`s (curved, different lengths) → eye `<circle>`s at irregular positions → `<animate>` writhe/pulse

### Example SVG (Aberration — hover/blob/medium):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="void" cx="0.4" cy="0.4" r="0.6">
      <stop offset="0%" stop-color="#2a0a2a"/>
      <stop offset="100%" stop-color="#0a000a" stop-opacity="0.8"/>
    </radialGradient>
  </defs>
  <path d="M22 20 Q18 28 20 36 Q24 44 32 42 Q40 46 44 38 Q48 28 42 20 Q36 14 28 16 Z" fill="url(#void)" stroke="#440044" stroke-width="0.5"/>
  <path d="M20 36 Q12 44 8 52 Q10 54 14 48" fill="#1a0a1a" stroke="#330033" stroke-width="0.5">
    <animate attributeName="d" values="M20 36 Q12 44 8 52 Q10 54 14 48;M20 36 Q14 46 10 50 Q12 52 16 46;M20 36 Q12 44 8 52 Q10 54 14 48" dur="3s" repeatCount="indefinite"/>
  </path>
  <path d="M44 38 Q50 46 54 52 Q52 54 48 48" fill="#1a0a1a" stroke="#330033" stroke-width="0.5"/>
  <path d="M28 16 Q24 8 20 4 Q22 6 26 12" fill="#1a0a1a" stroke="#330033" stroke-width="0.5"/>
  <path d="M42 20 Q48 14 52 10" fill="none" stroke="#330033" stroke-width="1"/>
  <circle cx="28" cy="24" r="2.5" fill="#000000"/>
  <circle cx="28" cy="24" r="1.2" fill="#88ff00">
    <animate attributeName="r" values="1;1.5;1" dur="2s" repeatCount="indefinite"/>
  </circle>
  <circle cx="38" cy="28" r="2" fill="#000000"/>
  <circle cx="38" cy="28" r="1" fill="#88ff00"/>
  <circle cx="32" cy="36" r="1.5" fill="#000000"/>
  <circle cx="32" cy="36" r="0.7" fill="#ccff00"/>
  <path d="M30 30 Q32 34 34 30" fill="none" stroke="#660066" stroke-width="0.8"/>
</svg>
```

---

## 10. ANCIENTS (32 entities)
- **Body type:** Titanic deity — massive winged/crowned figure, cosmic scale
- **Primary silhouette:** winged (hover/teleport, large/huge)
- **Movement:** hover / ground / teleport
- **Constant elements:** Imposing central form, crown/halo, wings or cosmic tendrils, overwhelming size suggestion, reality-warping aura
- **Variable elements:** Wing style (feathered/skeletal/energy/fractal), crown type, face (masked/absent/multiple), cosmic effects, corruption level
- **Color guide:** All books: deep void black + signature accent (Yaldabaoth = sickly gold/chains, divine = pure white/blue)
- **SVG structure:** `<defs>` with cosmic gradient → central body `<path>` (imposing) → wing `<path>`s (large, detailed) → crown/halo `<path>` → reality warp `<circle>`s → cosmic `<animate>` effects

### Example SVG (Ancient — hover/winged/large):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="cosmic" cx="0.5" cy="0.3" r="0.6">
      <stop offset="0%" stop-color="#ddaa00"/>
      <stop offset="60%" stop-color="#442200"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>
    <linearGradient id="wing" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#553300"/>
      <stop offset="100%" stop-color="#221100" stop-opacity="0.5"/>
    </linearGradient>
  </defs>
  <path d="M28 16 L36 16 L40 24 L42 40 L36 52 L28 52 L22 40 L24 24 Z" fill="url(#cosmic)" stroke="#664400" stroke-width="0.5"/>
  <path d="M24 24 L4 12 L2 20 L8 28 L14 24 L18 30 L22 28" fill="url(#wing)" opacity="0.8"/>
  <path d="M40 24 L60 12 L62 20 L56 28 L50 24 L46 30 L42 28" fill="url(#wing)" opacity="0.8"/>
  <path d="M26 10 L28 4 L32 2 L36 4 L38 10" fill="none" stroke="#ffcc00" stroke-width="1">
    <animate attributeName="stroke" values="#ffcc00;#ff8800;#ffcc00" dur="3s" repeatCount="indefinite"/>
  </path>
  <circle cx="32" cy="8" r="6" fill="none" stroke="#ffdd44" stroke-width="0.5" opacity="0.4">
    <animate attributeName="r" values="5;7;5" dur="4s" repeatCount="indefinite"/>
  </circle>
  <circle cx="30" cy="22" r="1.5" fill="#ffcc00"/>
  <circle cx="34" cy="22" r="1.5" fill="#ffcc00"/>
  <path d="M30 28 Q32 30 34 28" fill="none" stroke="#aa8800" stroke-width="0.5"/>
  <ellipse cx="32" cy="32" rx="24" ry="24" fill="none" stroke="#443300" stroke-width="0.3" opacity="0.2" stroke-dasharray="3,3">
    <animateTransform attributeName="transform" type="rotate" values="0 32 32;360 32 32" dur="20s" repeatCount="indefinite"/>
  </ellipse>
</svg>
```

---

## 11. DEMONS (20 entities)
- **Body type:** Bestial biped — hunched muscular biped with horns, claws, tail
- **Primary silhouette:** biped / quadruped (ground, large/huge)
- **Movement:** ground
- **Constant elements:** Horns, clawed hands, muscular hunched posture, fanged mouth, tail with barb
- **Variable elements:** Horn shape (curved/straight/branching), wing presence, tail style, arm length, fang count, skin texture (scaled/smooth/cracked), fire/shadow effects
- **Color guide:** All books: crimson, charcoal black, ember orange, sulfur yellow

### Example SVG (Demon — ground/biped/large):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="demon" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6b1a1a"/>
      <stop offset="100%" stop-color="#2a0a0a"/>
    </linearGradient>
  </defs>
  <path d="M26 18 L38 18 L42 28 L40 42 L36 48 L28 48 L24 42 L22 28 Z" fill="url(#demon)" stroke="#1a0000" stroke-width="0.5"/>
  <path d="M26 18 L22 8 L24 10 L28 16" fill="#4a1a1a"/>
  <path d="M38 18 L42 8 L40 10 L36 16" fill="#4a1a1a"/>
  <path d="M22 26 L10 30 L8 28 L12 24 L16 28" fill="#5a1a1a" stroke="#1a0000" stroke-width="0.3"/>
  <path d="M42 26 L54 30 L56 28 L52 24 L48 28" fill="#5a1a1a" stroke="#1a0000" stroke-width="0.3"/>
  <path d="M28 48 L26 60 L30 60 L32 50" fill="#3a0a0a"/>
  <path d="M36 48 L34 60 L38 60 L40 50" fill="#3a0a0a"/>
  <path d="M40 42 Q46 48 50 52 Q52 50 48 44" fill="#4a1a1a" stroke="#1a0000" stroke-width="0.3"/>
  <circle cx="30" cy="22" r="1.5" fill="#ff4400">
    <animate attributeName="fill" values="#ff4400;#ff8800;#ff4400" dur="2s" repeatCount="indefinite"/>
  </circle>
  <circle cx="36" cy="22" r="1.5" fill="#ff4400">
    <animate attributeName="fill" values="#ff4400;#ff8800;#ff4400" dur="2s" repeatCount="indefinite"/>
  </circle>
  <path d="M29 26 L32 28 L35 26" fill="none" stroke="#ff2200" stroke-width="0.5"/>
  <path d="M10 30 L6 28 L4 30" fill="#8a4444" stroke="#1a0000" stroke-width="0.3"/>
</svg>
```

---

## 12. CELESTIALS (18 entities)
- **Body type:** Radiant winged figure — luminous biped with multiple wings, halo
- **Primary silhouette:** winged (teleport/flying/hover)
- **Movement:** teleport / flying / hover
- **Constant elements:** Wings (2-6), halo/nimbus, luminous body, radiance lines, symmetrical form
- **Variable elements:** Wing count, halo style, light intensity, face (serene/terrible/absent), weapon (sword/staff/none), wing feather detail
- **Color guide:** All books: pure white, gold, sky blue, silver. Book 3 celestials are brightest.

### Example SVG (Celestial — teleport/winged/medium):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="holy" cx="0.5" cy="0.3" r="0.5">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#ffeedd"/>
      <stop offset="100%" stop-color="#ddbb88" stop-opacity="0.3"/>
    </radialGradient>
  </defs>
  <ellipse cx="32" cy="32" rx="20" ry="20" fill="url(#holy)" opacity="0.2">
    <animate attributeName="rx" values="18;22;18" dur="3s" repeatCount="indefinite"/>
  </ellipse>
  <path d="M28 18 L36 18 L38 30 L36 44 L28 44 L26 30 Z" fill="#ffeedd" stroke="#ddbb88" stroke-width="0.3"/>
  <circle cx="32" cy="14" r="5" fill="#fff8ee"/>
  <path d="M26 22 L6 14 L4 18 L10 24 L16 20 L22 26" fill="#fff0dd" opacity="0.7"/>
  <path d="M38 22 L58 14 L60 18 L54 24 L48 20 L42 26" fill="#fff0dd" opacity="0.7"/>
  <circle cx="32" cy="8" r="8" fill="none" stroke="#ffdd88" stroke-width="0.8" opacity="0.6">
    <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite"/>
  </circle>
  <circle cx="30" cy="13" r="0.8" fill="#88aaff"/>
  <circle cx="34" cy="13" r="0.8" fill="#88aaff"/>
  <path d="M28 44 L26 56 L30 56 L32 46" fill="#ffe8cc"/>
  <path d="M36 44 L34 56 L38 56 L40 46" fill="#ffe8cc"/>
  <line x1="32" y1="2" x2="32" y2="6" stroke="#ffcc44" stroke-width="1" opacity="0.5"/>
</svg>
```

---

## 13. CONSTRUCTS (12 entities)
- **Body type:** Golem/automaton — massive blocky biped, geometric, heavy
- **Primary silhouette:** biped (ground, huge/large)
- **Movement:** ground
- **Constant elements:** Blocky rectangular torso, heavy square limbs, geometric head, rune markings, stone/metal texture
- **Variable elements:** Material (stone/iron/crystal/bone), rune patterns, eye count, arm weapons, surface cracks, glow color
- **Color guide:** Book 1: dark stone/obsidian. Book 2: wood/iron. Book 3: marble/gold-inlaid

### Example SVG (Construct — ground/biped/huge):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="stone" x1="0" y1="0" x2="0.2" y2="1">
      <stop offset="0%" stop-color="#7a7a8a"/>
      <stop offset="100%" stop-color="#3a3a4a"/>
    </linearGradient>
  </defs>
  <rect x="22" y="18" width="20" height="28" rx="2" fill="url(#stone)" stroke="#2a2a3a" stroke-width="0.5"/>
  <rect x="24" y="10" width="16" height="10" rx="3" fill="#6a6a7a" stroke="#2a2a3a" stroke-width="0.5"/>
  <rect x="12" y="20" width="8" height="22" rx="2" fill="#5a5a6a"/>
  <rect x="44" y="20" width="8" height="22" rx="2" fill="#5a5a6a"/>
  <rect x="24" y="46" width="8" height="14" rx="1" fill="#4a4a5a"/>
  <rect x="34" y="46" width="8" height="14" rx="1" fill="#4a4a5a"/>
  <circle cx="29" cy="14" r="2" fill="#44aaff">
    <animate attributeName="fill" values="#44aaff;#88ccff;#44aaff" dur="2s" repeatCount="indefinite"/>
  </circle>
  <circle cx="35" cy="14" r="2" fill="#44aaff">
    <animate attributeName="fill" values="#44aaff;#88ccff;#44aaff" dur="2s" repeatCount="indefinite"/>
  </circle>
  <line x1="28" y1="24" x2="28" y2="32" stroke="#44aaff" stroke-width="0.5" opacity="0.4"/>
  <line x1="36" y1="26" x2="36" y2="34" stroke="#44aaff" stroke-width="0.5" opacity="0.4"/>
  <path d="M30 28 L34 28 L34 36 L30 36 Z" fill="none" stroke="#44aaff" stroke-width="0.3" opacity="0.5"/>
  <rect x="10" y="40" width="4" height="4" rx="1" fill="#5a5a6a"/>
</svg>
```

---

## 14. PLANTS (6 entities)
- **Body type:** Animated flora — rooted mass with vines/branches, organic
- **Primary silhouette:** blob (ground, medium/small)
- **Movement:** ground
- **Constant elements:** Root base, main trunk/stalk, extending vines/branches, organic texture
- **Variable elements:** Vine count, flower/fruit presence, thorn density, leaf shape, root spread, bioluminescence
- **Color guide:** Book 1: dark green, bioluminescent blue veins. Book 2: lush green, brown bark. Book 3: golden leaves, white bark

### Example SVG (Plant — ground/blob/medium):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="bark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3a5a2a"/>
      <stop offset="100%" stop-color="#1a3a0a"/>
    </linearGradient>
  </defs>
  <path d="M28 56 Q24 58 20 56 Q16 54 18 48 Q14 44 16 38 Q20 36 24 38 L26 32" fill="none" stroke="#3a2a1a" stroke-width="2"/>
  <path d="M36 56 Q40 58 44 56 Q48 54 46 48 Q50 44 48 38 Q44 36 40 38 L38 32" fill="none" stroke="#3a2a1a" stroke-width="2"/>
  <path d="M26 32 Q28 22 32 16 Q36 22 38 32" fill="url(#bark)" stroke="#2a1a0a" stroke-width="0.5"/>
  <path d="M32 16 Q26 10 18 14 Q22 8 28 12" fill="#2a6a1a" opacity="0.8"/>
  <path d="M32 16 Q38 10 46 14 Q42 8 36 12" fill="#2a6a1a" opacity="0.8"/>
  <path d="M30 24 Q22 20 16 24 Q20 18 26 22" fill="#3a7a2a" opacity="0.7"/>
  <path d="M34 24 Q42 20 48 24 Q44 18 38 22" fill="#3a7a2a" opacity="0.7"/>
  <circle cx="32" cy="14" r="3" fill="#ff6688" opacity="0.6"/>
  <circle cx="32" cy="14" r="1.5" fill="#ffaacc"/>
  <path d="M18 14 L14 18" fill="none" stroke="#1a4a0a" stroke-width="1" opacity="0.5">
    <animate attributeName="d" values="M18 14 L14 18;M18 14 L12 16;M18 14 L14 18" dur="4s" repeatCount="indefinite"/>
  </path>
  <circle cx="20" cy="50" r="1" fill="#88ff44" opacity="0.4">
    <animate attributeName="opacity" values="0.2;0.6;0.2" dur="3s" repeatCount="indefinite"/>
  </circle>
</svg>
```

---

## 15. UNDEAD (3 entities)
- **Body type:** Shambling biped — hunched, decayed humanoid with exposed bones/wounds
- **Primary silhouette:** biped/quadruped (ground)
- **Movement:** ground
- **Constant elements:** Skeletal features, decay marks, hunched posture, exposed ribs/bones, hollow eyes
- **Variable elements:** Decay level, clothing remnants, weapon presence, glow color (necrotic green), limb completeness
- **Color guide:** All books: ash gray, necrotic green, bone white, dried blood brown

### Example SVG (Undead — ground/biped/medium):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="decay" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8a8a7a"/>
      <stop offset="100%" stop-color="#4a4a3a"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="14" r="5" fill="#c8c0a8" stroke="#6a6a5a" stroke-width="0.5"/>
  <circle cx="30" cy="13" r="2" fill="#1a1a0a"/>
  <circle cx="34" cy="13" r="2" fill="#1a1a0a"/>
  <circle cx="30" cy="13" r="0.8" fill="#44ff44" opacity="0.6">
    <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite"/>
  </circle>
  <circle cx="34" cy="13" r="0.8" fill="#44ff44" opacity="0.6">
    <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" begin="0.5s"/>
  </circle>
  <path d="M28 19 L36 19 L40 30 L38 44 L26 44 L24 30 Z" fill="url(#decay)" stroke="#4a4a3a" stroke-width="0.5"/>
  <path d="M28 26 L30 28 L28 30 L30 32 L28 34" fill="none" stroke="#e8e0c8" stroke-width="0.8"/>
  <path d="M36 26 L34 28 L36 30 L34 32 L36 34" fill="none" stroke="#e8e0c8" stroke-width="0.8"/>
  <path d="M24 24 L14 32 L16 36 L22 30" fill="#6a6a5a" stroke="#4a4a3a" stroke-width="0.3"/>
  <path d="M40 24 L50 34 L48 36 L42 28" fill="#6a6a5a" stroke="#4a4a3a" stroke-width="0.3"/>
  <path d="M28 44 L26 58 L30 58 L32 46" fill="#5a5a4a"/>
  <path d="M36 44 L38 58 L34 58 L32 46" fill="#5a5a4a"/>
  <path d="M30 16 L32 18 L34 16" fill="none" stroke="#3a3a2a" stroke-width="0.5"/>
</svg>
```

---

## Cross-Family Distinction Summary

| Family | Body Plan | Key Differentiator |
|--------|-----------|-------------------|
| mechanisms | Angular biped with gear joints | Metallic gradients, panel lines, glowing core |
| beasts | Quadruped with snout + tail | Fur texture, 4 legs, animal features |
| phantasms | Floating wisp with tendrils | Transparent layers, hollow eyes, fade edges |
| elementals | Energy orb with radiating arcs | Particle effects, energy core, corona |
| collectives | Cluster of 3-5 small shapes | Multiple individuals, connecting energy |
| humanoids | Upright biped with arms | Clothing/armor, weapons, distinct face |
| terrains | Amorphous ground mass | Landscape features, embedded crystals/eyes |
| chronicles | Hourglass/clock shape | Time symbols, echo effects, fracture lines |
| aberrations | Asymmetric tentacled mass | Wrong geometry, multiple misplaced eyes |
| ancients | Titanic winged deity | Cosmic scale, crown/halo, reality warp |
| demons | Hunched horned biped | Horns, claws, tail, ember glow |
| celestials | Radiant winged figure | Multiple wings, halo, pure light |
| constructs | Blocky geometric golem | Heavy rectangles, rune markings |
| plants | Rooted vine mass | Branches, leaves, organic texture |
| undead | Shambling decayed biped | Exposed bones, necrotic glow, decay |
