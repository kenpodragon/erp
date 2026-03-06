/**
 * Class Visual Identity — applies CSS custom properties from visual_config JSONB.
 *
 * Called at session start when the character class's visual_config is available.
 * Sets --class-primary, --class-secondary, --class-damage-text on the root game container.
 */

export interface ClassVisualConfig {
  primary_color?: string;
  secondary_color?: string;
  damage_text_color?: string;
  particle_tint?: string;
  avatar_url?: string;
  border_glow_intensity?: number;
  idle_sprite_tint?: string;
}

const CSS_VAR_MAP: Record<keyof ClassVisualConfig, string> = {
  primary_color: '--class-primary',
  secondary_color: '--class-secondary',
  damage_text_color: '--class-damage-text',
  particle_tint: '--class-particle-tint',
  avatar_url: '--class-avatar-url',
  border_glow_intensity: '--class-glow-intensity',
  idle_sprite_tint: '--class-idle-tint',
};

/**
 * Apply class visual config as CSS custom properties on the target element.
 * Falls back to document.documentElement if no element is provided.
 */
export function applyClassVisuals(
  config: ClassVisualConfig | null | undefined,
  element?: HTMLElement,
): void {
  const el = element || document.documentElement;

  if (!config) {
    // Clear all class visual properties
    Object.values(CSS_VAR_MAP).forEach(varName => el.style.removeProperty(varName));
    return;
  }

  for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
    const value = config[key as keyof ClassVisualConfig];
    if (value !== undefined && value !== null) {
      el.style.setProperty(cssVar, String(value));
    }
  }
}

/**
 * Convert hex color string to a numeric tint value for PixiJS.
 * e.g., "#FF4444" -> 0xFF4444
 */
export function hexToPixiTint(hex: string): number {
  const cleaned = hex.replace('#', '');
  return parseInt(cleaned, 16);
}
