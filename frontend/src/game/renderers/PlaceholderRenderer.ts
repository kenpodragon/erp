/**
 * PlaceholderRenderer — fallback renderer for unimplemented categories
 * and missing render definitions.
 *
 * Draws a colored rectangle with category-appropriate border and the
 * asset_key as a centered text label. Logs a console.warn on the
 * first render of each unique asset_key.
 */

export interface RenderResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

const CATEGORY_BORDER_COLORS: Record<string, string> = {
  entity_sprite: '#cc3333',
  class_sprite: '#cc3333',
  background: '#3366cc',
  item_icon: '#9944cc',
  artifact_icon: '#9944cc',
  achievement_icon: '#9944cc',
  skill_icon: '#9944cc',
  ui_icon: '#9944cc',
  avatar: '#cc9933',
  skin: '#666666',
  badge: '#666666',
  flair: '#666666',
  spell_effect: '#666666',
  narrative_image: '#666666',
  portrait: '#666666',
};

const CATEGORY_FILL_COLORS: Record<string, string> = {
  entity_sprite: '#331111',
  class_sprite: '#331111',
  background: '#111133',
  item_icon: '#221133',
  artifact_icon: '#221133',
  achievement_icon: '#221133',
  skill_icon: '#221133',
  ui_icon: '#221133',
  avatar: '#332211',
  skin: '#222222',
  badge: '#222222',
  flair: '#222222',
  spell_effect: '#222222',
  narrative_image: '#222222',
  portrait: '#222222',
};

const warnedKeys = new Set<string>();

export function render(
  assetKey: string,
  category: string,
  width = 64,
  height = 64,
): RenderResult {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const fill = CATEGORY_FILL_COLORS[category] || '#1a1a1a';
  const border = CATEGORY_BORDER_COLORS[category] || '#555555';

  // Fill background
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // Diagonal cross (visual indicator this is a placeholder)
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width, height);
  ctx.moveTo(width, 0);
  ctx.lineTo(0, height);
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  // Asset key label
  const fontSize = Math.max(8, Math.min(12, width / 8));
  ctx.font = `${fontSize}px monospace`;
  ctx.fillStyle = '#aaaaaa';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Truncate long keys
  const maxChars = Math.floor(width / (fontSize * 0.6));
  const label = assetKey.length > maxChars
    ? assetKey.substring(0, maxChars - 2) + '..'
    : assetKey;
  ctx.fillText(label, width / 2, height / 2);

  // Category label at bottom
  const catFontSize = Math.max(6, fontSize - 2);
  ctx.font = `${catFontSize}px monospace`;
  ctx.fillStyle = border;
  ctx.fillText(category, width / 2, height - catFontSize);

  // Warn once
  if (!warnedKeys.has(assetKey)) {
    warnedKeys.add(assetKey);
    console.warn(
      `[AssetRegistry] Placeholder rendered for missing asset: "${assetKey}" (category: ${category})`
    );
  }

  return { canvas, width, height };
}
