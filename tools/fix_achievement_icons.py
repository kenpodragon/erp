"""
Fix achievement icon tier progression in asset_registry.
Each tier chain gets visually distinct SVGs that scale in complexity.
"""
import os, psycopg2, json, re
from collections import defaultdict
from dotenv import load_dotenv

load_dotenv('C:/Users/ssala/OneDrive/Desktop/MMORPG/erp/backend/.env')
db_url = os.getenv('DATABASE_URL').replace('host.docker.internal', 'localhost')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

# Category color schemes
COLORS = {
    'combat':      ('#CC3333', '#FF4444', '#881100'),
    'exploration': ('#33CC33', '#44FF44', '#118800'),
    'collection':  ('#CCAA33', '#FFD700', '#886600'),
    'social':      ('#3333CC', '#4444FF', '#110088'),
    'story':       ('#9933CC', '#AA44FF', '#660088'),
    'narrative':   ('#9933CC', '#AA44FF', '#660088'),
    'training':    ('#CC6633', '#FF8844', '#884400'),
    'economics':   ('#CCAA33', '#FFD700', '#886600'),
}

# Theme shapes per chain base name
CHAIN_THEMES = {
    'slayer':   'sword',
    'damage':   'explosion',
    'wave':     'wave',
    'speed':    'lightning',
    'ritual':   'flame',
    'chapter':  'book',
    'lore':     'scroll',
    'hidden':   'eye',
    'gold':     'coin',
    'essence':  'crystal',
    'upgrade':  'arrow',
    'click':    'hand',
    'idle':     'hourglass',
    'level':    'star',
    'skill':    'shield',
    'artifact': 'gem',
    'boss':     'skull',
    'bazaar':   'scales',
    'general':  'trophy',
}

def get_theme(icon_key):
    """Extract theme from icon key like achievement_slayer_1 -> sword"""
    parts = icon_key.replace('achievement_', '').split('_')
    base = parts[0] if parts else 'general'
    return CHAIN_THEMES.get(base, 'trophy')

def make_svg(theme, tier, category):
    """Generate SVG with complexity scaling by tier."""
    c1, c2, c3 = COLORS.get(category, ('#CCAA33', '#FFD700', '#886600'))

    if tier == 1:
        return _tier1_svg(theme, c1, c2, c3)
    elif tier == 2:
        return _tier2_svg(theme, c1, c2, c3)
    else:
        return _tier3_svg(theme, c1, c2, c3, tier)

def _tier1_svg(theme, c1, c2, c3):
    """Tier 1: Simple icon, single main element, basic colors, >=4 elements, ~400 chars"""
    # Each shape must have >=3 inner elements (+ 1 bg circle = >=4 total)
    shapes = {
        'sword': f'<rect x="30" y="10" width="4" height="30" fill="{c2}" rx="1"/><rect x="24" y="36" width="16" height="4" fill="{c1}" rx="1"/><circle cx="32" cy="44" r="2" fill="{c2}"/>',
        'explosion': f'<circle cx="32" cy="32" r="12" fill="{c1}" opacity="0.4"/><circle cx="32" cy="32" r="8" fill="{c2}"/><circle cx="32" cy="32" r="4" fill="#fff" opacity="0.5"/>',
        'wave': f'<path d="M12 32 Q22 22 32 32 Q42 42 52 32" fill="none" stroke="{c2}" stroke-width="3"/><circle cx="32" cy="32" r="4" fill="{c1}"/><path d="M16 38 Q26 30 36 38 Q46 46 52 40" fill="none" stroke="{c1}" stroke-width="1.5" opacity="0.5"/>',
        'lightning': f'<polygon points="36,10 26,30 34,30 28,50 38,28 30,28" fill="{c2}"/><line x1="32" y1="10" x2="32" y2="16" stroke="#fff" stroke-width="1" opacity="0.5"/><circle cx="30" cy="48" r="2" fill="{c1}" opacity="0.6"/>',
        'flame': f'<ellipse cx="32" cy="38" rx="8" ry="12" fill="{c1}"/><ellipse cx="32" cy="34" rx="5" ry="8" fill="{c2}"/><ellipse cx="32" cy="30" rx="2" ry="4" fill="#fff" opacity="0.4"/>',
        'book': f'<rect x="20" y="18" width="24" height="28" fill="{c3}" rx="2"/><rect x="22" y="20" width="20" height="24" fill="{c1}" rx="1"/><line x1="26" y1="28" x2="38" y2="28" stroke="{c2}" stroke-width="1"/>',
        'scroll': f'<rect x="22" y="16" width="20" height="32" fill="{c1}" rx="3"/><circle cx="32" cy="16" r="4" fill="{c2}"/><circle cx="32" cy="48" r="4" fill="{c2}"/>',
        'eye': f'<ellipse cx="32" cy="32" rx="14" ry="8" fill="{c1}"/><circle cx="32" cy="32" r="5" fill="{c2}"/><circle cx="32" cy="32" r="2" fill="#fff"/>',
        'coin': f'<circle cx="32" cy="32" r="12" fill="{c2}"/><circle cx="32" cy="32" r="9" fill="{c1}"/><circle cx="32" cy="32" r="12" fill="none" stroke="{c3}" stroke-width="1"/>',
        'crystal': f'<polygon points="32,14 42,32 32,50 22,32" fill="{c2}"/><polygon points="32,18 38,32 32,46 26,32" fill="{c1}"/><line x1="32" y1="14" x2="32" y2="50" stroke="#fff" stroke-width="0.5" opacity="0.4"/>',
        'arrow': f'<polygon points="32,12 42,28 36,28 36,48 28,48 28,28 22,28" fill="{c2}"/><polygon points="32,16 38,28 34,28 34,44 30,44 30,28 26,28" fill="{c1}"/><circle cx="32" cy="20" r="2" fill="#fff" opacity="0.4"/>',
        'hand': f'<circle cx="32" cy="28" r="8" fill="{c2}"/><rect x="28" y="34" width="8" height="14" fill="{c1}" rx="2"/><circle cx="32" cy="26" r="2" fill="#fff" opacity="0.5"/>',
        'hourglass': f'<polygon points="22,16 42,16 32,32 42,48 22,48 32,32" fill="none" stroke="{c2}" stroke-width="2"/><rect x="28" y="30" width="8" height="4" fill="{c1}"/><rect x="22" y="14" width="20" height="3" fill="{c2}"/>',
        'star': f'<polygon points="32,12 36,24 48,24 38,32 42,44 32,36 22,44 26,32 16,24 28,24" fill="{c2}"/><circle cx="32" cy="28" r="3" fill="#fff" opacity="0.3"/><circle cx="32" cy="28" r="1.5" fill="#fff" opacity="0.5"/>',
        'shield': f'<path d="M32 14 L44 22 L44 36 L32 50 L20 36 L20 22 Z" fill="{c1}" stroke="{c2}" stroke-width="2"/><circle cx="32" cy="32" r="4" fill="{c2}"/><circle cx="32" cy="32" r="2" fill="#fff" opacity="0.3"/>',
        'gem': f'<polygon points="32,14 44,26 38,50 26,50 20,26" fill="{c2}"/><polygon points="32,18 40,27 36,46 28,46 24,27" fill="{c1}"/><circle cx="30" cy="26" r="2" fill="#fff" opacity="0.4"/>',
        'skull': f'<circle cx="32" cy="28" r="12" fill="{c1}"/><circle cx="27" cy="26" r="3" fill="{c3}"/><circle cx="37" cy="26" r="3" fill="{c3}"/>',
        'scales': f'<rect x="30" y="14" width="4" height="30" fill="{c2}"/><rect x="18" y="14" width="28" height="3" fill="{c1}"/><circle cx="22" cy="28" r="5" fill="{c1}" opacity="0.6"/>',
        'trophy': f'<rect x="26" y="20" width="12" height="16" fill="{c2}" rx="4"/><rect x="28" y="36" width="8" height="8" fill="{c1}"/><rect x="24" y="44" width="16" height="3" fill="{c2}"/>',
    }
    shape = shapes.get(theme, shapes['trophy'])
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#1a1a1a" stroke="{c3}" stroke-width="2"/>{shape}</svg>'

def _tier2_svg(theme, c1, c2, c3):
    """Tier 2: Doubled/larger elements, brighter colors, >=6 elements, ~500 chars"""
    shapes = {
        'sword': f'<rect x="29" y="8" width="6" height="32" fill="{c2}" rx="1"/><rect x="22" y="36" width="20" height="5" fill="{c1}" rx="1"/><circle cx="32" cy="42" r="3" fill="{c2}"/><line x1="32" y1="8" x2="32" y2="14" stroke="{c2}" stroke-width="2"/>',
        'explosion': f'<circle cx="32" cy="32" r="14" fill="{c1}" opacity="0.5"/><circle cx="32" cy="32" r="10" fill="{c2}"/><circle cx="32" cy="32" r="6" fill="#fff" opacity="0.6"/><line x1="32" y1="14" x2="32" y2="18" stroke="{c2}" stroke-width="2"/>',
        'wave': f'<path d="M8 32 Q18 18 28 32 Q38 46 48 32 Q52 26 56 32" fill="none" stroke="{c2}" stroke-width="3"/><path d="M8 38 Q18 28 28 38 Q38 48 48 38" fill="none" stroke="{c1}" stroke-width="2"/><circle cx="32" cy="32" r="4" fill="{c2}"/><circle cx="20" cy="26" r="2" fill="{c2}" opacity="0.4"/>',
        'lightning': f'<polygon points="38,8 24,30 34,30 26,52 40,28 30,28" fill="{c2}"/><line x1="20" y1="16" x2="26" y2="20" stroke="{c1}" stroke-width="2"/><line x1="44" y1="16" x2="38" y2="20" stroke="{c1}" stroke-width="2"/><circle cx="22" cy="14" r="2" fill="{c2}" opacity="0.5"/>',
        'flame': f'<ellipse cx="32" cy="38" rx="12" ry="16" fill="{c3}"/><ellipse cx="32" cy="36" rx="9" ry="12" fill="{c1}"/><ellipse cx="32" cy="32" rx="5" ry="8" fill="{c2}"/><ellipse cx="28" cy="30" rx="2" ry="4" fill="{c2}" opacity="0.6"/>',
        'book': f'<rect x="18" y="16" width="28" height="32" fill="{c3}" rx="2"/><rect x="20" y="18" width="24" height="28" fill="{c1}" rx="1"/><line x1="24" y1="26" x2="40" y2="26" stroke="{c2}" stroke-width="1"/><line x1="24" y1="32" x2="38" y2="32" stroke="{c2}" stroke-width="1"/>',
        'scroll': f'<rect x="20" y="14" width="24" height="36" fill="{c1}" rx="3"/><circle cx="32" cy="14" r="5" fill="{c2}"/><circle cx="32" cy="50" r="5" fill="{c2}"/><line x1="26" y1="26" x2="38" y2="26" stroke="{c3}" stroke-width="1"/>',
        'eye': f'<ellipse cx="32" cy="32" rx="18" ry="10" fill="{c1}"/><circle cx="32" cy="32" r="7" fill="{c2}"/><circle cx="32" cy="32" r="3" fill="#fff"/><ellipse cx="32" cy="32" rx="18" ry="10" fill="none" stroke="{c3}" stroke-width="2"/>',
        'coin': f'<circle cx="32" cy="32" r="16" fill="{c2}"/><circle cx="32" cy="32" r="12" fill="{c1}"/><text x="32" y="37" text-anchor="middle" fill="{c2}" font-size="14" font-weight="bold">$</text><circle cx="32" cy="32" r="16" fill="none" stroke="{c3}" stroke-width="1"/>',
        'crystal': f'<polygon points="32,10 46,32 32,54 18,32" fill="{c2}"/><polygon points="32,16 40,32 32,48 24,32" fill="{c1}"/><line x1="32" y1="10" x2="32" y2="54" stroke="{c2}" stroke-width="1" opacity="0.5"/><line x1="18" y1="32" x2="46" y2="32" stroke="{c2}" stroke-width="1" opacity="0.5"/>',
        'arrow': f'<polygon points="32,8 46,28 38,28 38,52 26,52 26,28 18,28" fill="{c2}"/><polygon points="32,14 40,28 36,28 36,48 28,48 28,28 24,28" fill="{c1}"/><circle cx="32" cy="20" r="3" fill="#fff" opacity="0.3"/><line x1="32" y1="8" x2="32" y2="52" stroke="#fff" stroke-width="0.5" opacity="0.2"/>',
        'hand': f'<circle cx="32" cy="26" r="10" fill="{c2}"/><rect x="26" y="34" width="12" height="16" fill="{c1}" rx="3"/><circle cx="28" cy="24" r="2" fill="#fff"/><circle cx="36" cy="24" r="2" fill="#fff"/>',
        'hourglass': f'<polygon points="20,14 44,14 32,32 44,50 20,50 32,32" fill="none" stroke="{c2}" stroke-width="3"/><rect x="20" y="12" width="24" height="3" fill="{c1}"/><rect x="20" y="49" width="24" height="3" fill="{c1}"/><circle cx="32" cy="40" r="4" fill="{c2}"/>',
        'star': f'<polygon points="32,8 37,22 52,22 40,32 44,46 32,38 20,46 24,32 12,22 27,22" fill="{c2}"/><polygon points="32,14 35,24 44,24 37,30 40,40 32,34 24,40 27,30 20,24 29,24" fill="{c1}"/><circle cx="32" cy="26" r="3" fill="#fff" opacity="0.3"/><circle cx="32" cy="26" r="1.5" fill="#fff" opacity="0.5"/>',
        'shield': f'<path d="M32 10 L48 20 L48 38 L32 54 L16 38 L16 20 Z" fill="{c1}" stroke="{c2}" stroke-width="2"/><path d="M32 18 L40 24 L40 34 L32 44 L24 34 L24 24 Z" fill="{c3}"/><circle cx="32" cy="30" r="4" fill="{c2}"/><circle cx="32" cy="30" r="2" fill="#fff" opacity="0.3"/>',
        'gem': f'<polygon points="32,10 48,24 40,54 24,54 16,24" fill="{c2}"/><polygon points="32,16 42,26 36,48 28,48 22,26" fill="{c1}"/><line x1="32" y1="10" x2="32" y2="54" stroke="#fff" stroke-width="1" opacity="0.3"/><circle cx="30" cy="24" r="2" fill="#fff" opacity="0.4"/>',
        'skull': f'<circle cx="32" cy="26" r="14" fill="{c1}"/><circle cx="26" cy="24" r="4" fill="{c3}"/><circle cx="38" cy="24" r="4" fill="{c3}"/><rect x="28" y="36" width="8" height="6" fill="{c1}" rx="1"/>',
        'scales': f'<rect x="30" y="12" width="4" height="34" fill="{c2}"/><rect x="16" y="12" width="32" height="4" fill="{c1}"/><circle cx="20" cy="28" r="6" fill="{c1}" stroke="{c2}" stroke-width="1"/><circle cx="44" cy="28" r="6" fill="{c1}" stroke="{c2}" stroke-width="1"/>',
        'trophy': f'<rect x="24" y="18" width="16" height="18" fill="{c2}" rx="6"/><rect x="28" y="36" width="8" height="6" fill="{c1}"/><rect x="24" y="42" width="16" height="3" fill="{c2}"/><circle cx="32" cy="26" r="3" fill="#fff" opacity="0.4"/>',
    }
    shape = shapes.get(theme, shapes['trophy'])
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#1a1a1a" stroke="{c2}" stroke-width="2"/><circle cx="32" cy="32" r="28" fill="none" stroke="{c1}" stroke-width="1" opacity="0.3"/>{shape}</svg>'

def _tier3_svg(theme, c1, c2, c3, tier):
    """Tier 3+: Full composition, glow effects, ornate frame, >=8 elements, ~700+ chars"""
    # More glow intensity for higher tiers
    blur = min(2 + tier, 6)
    glow_opacity = min(0.3 + tier * 0.1, 0.8)

    shapes = {
        'sword': f'<rect x="28" y="6" width="8" height="34" fill="{c2}" rx="2"/><rect x="20" y="36" width="24" height="6" fill="{c1}" rx="2"/><circle cx="32" cy="44" r="4" fill="{c2}"/><line x1="32" y1="6" x2="32" y2="12" stroke="#fff" stroke-width="1" opacity="0.6"/><polygon points="28,6 32,2 36,6" fill="{c2}"/>',
        'explosion': f'<circle cx="32" cy="32" r="16" fill="{c1}" opacity="0.4"/><circle cx="32" cy="32" r="12" fill="{c2}"/><circle cx="32" cy="32" r="7" fill="#fff" opacity="0.5"/><line x1="32" y1="12" x2="32" y2="16" stroke="{c2}" stroke-width="2"/><line x1="12" y1="32" x2="16" y2="32" stroke="{c2}" stroke-width="2"/><line x1="48" y1="32" x2="52" y2="32" stroke="{c2}" stroke-width="2"/>',
        'wave': f'<path d="M6 30 Q16 16 26 30 Q36 44 46 30 Q52 22 58 30" fill="none" stroke="{c2}" stroke-width="4"/><path d="M6 36 Q16 24 26 36 Q36 48 46 36" fill="none" stroke="{c1}" stroke-width="2"/><path d="M10 42 Q20 34 30 42 Q40 50 50 42" fill="none" stroke="{c1}" stroke-width="1" opacity="0.5"/><circle cx="32" cy="30" r="5" fill="{c2}"/><circle cx="32" cy="30" r="2" fill="#fff"/>',
        'lightning': f'<polygon points="40,4 22,30 34,30 24,56 44,26 32,26" fill="{c2}"/><polygon points="38,10 26,30 34,30 26,50 40,28 32,28" fill="{c1}"/><line x1="16" y1="14" x2="24" y2="20" stroke="{c2}" stroke-width="2"/><line x1="48" y1="14" x2="40" y2="20" stroke="{c2}" stroke-width="2"/><circle cx="18" cy="12" r="2" fill="{c2}"/>',
        'flame': f'<ellipse cx="32" cy="40" rx="14" ry="18" fill="{c3}"/><ellipse cx="32" cy="38" rx="10" ry="14" fill="{c1}"/><ellipse cx="32" cy="34" rx="6" ry="10" fill="{c2}"/><ellipse cx="32" cy="28" rx="3" ry="6" fill="#fff" opacity="0.5"/><ellipse cx="26" cy="32" rx="3" ry="5" fill="{c2}" opacity="0.5"/><ellipse cx="38" cy="34" rx="3" ry="5" fill="{c2}" opacity="0.4"/>',
        'book': f'<rect x="16" y="14" width="32" height="36" fill="{c3}" rx="3"/><rect x="18" y="16" width="28" height="32" fill="{c1}" rx="2"/><line x1="22" y1="24" x2="42" y2="24" stroke="{c2}" stroke-width="1"/><line x1="22" y1="30" x2="40" y2="30" stroke="{c2}" stroke-width="1"/><line x1="22" y1="36" x2="38" y2="36" stroke="{c2}" stroke-width="1"/><polygon points="30,16 34,16 34,22 32,20 30,22" fill="{c2}"/>',
        'scroll': f'<rect x="18" y="12" width="28" height="40" fill="{c1}" rx="4"/><circle cx="32" cy="12" r="6" fill="{c2}"/><circle cx="32" cy="52" r="6" fill="{c2}"/><line x1="24" y1="24" x2="40" y2="24" stroke="{c3}" stroke-width="1"/><line x1="24" y1="30" x2="38" y2="30" stroke="{c3}" stroke-width="1"/><line x1="24" y1="36" x2="40" y2="36" stroke="{c3}" stroke-width="1"/>',
        'eye': f'<ellipse cx="32" cy="32" rx="22" ry="12" fill="{c1}"/><ellipse cx="32" cy="32" rx="22" ry="12" fill="none" stroke="{c2}" stroke-width="2"/><circle cx="32" cy="32" r="9" fill="{c2}"/><circle cx="32" cy="32" r="4" fill="#fff"/><circle cx="34" cy="30" r="2" fill="#fff" opacity="0.6"/><line x1="8" y1="32" x2="12" y2="32" stroke="{c2}" stroke-width="2"/><line x1="52" y1="32" x2="56" y2="32" stroke="{c2}" stroke-width="2"/>',
        'coin': f'<circle cx="32" cy="32" r="20" fill="{c2}"/><circle cx="32" cy="32" r="16" fill="{c1}"/><circle cx="32" cy="32" r="12" fill="{c2}" opacity="0.3"/><text x="32" y="38" text-anchor="middle" fill="{c2}" font-size="18" font-weight="bold">$</text><circle cx="32" cy="32" r="20" fill="none" stroke="#fff" stroke-width="1" opacity="0.3"/><line x1="32" y1="10" x2="32" y2="14" stroke="#fff" stroke-width="1" opacity="0.4"/>',
        'crystal': f'<polygon points="32,6 50,30 38,58 26,58 14,30" fill="{c2}"/><polygon points="32,12 44,30 36,52 28,52 20,30" fill="{c1}"/><line x1="32" y1="6" x2="32" y2="58" stroke="#fff" stroke-width="1" opacity="0.4"/><line x1="14" y1="30" x2="50" y2="30" stroke="#fff" stroke-width="1" opacity="0.3"/><polygon points="32,12 38,30 32,48" fill="#fff" opacity="0.1"/><circle cx="32" cy="30" r="3" fill="#fff" opacity="0.3"/>',
        'arrow': f'<polygon points="32,4 50,28 40,28 40,56 24,56 24,28 14,28" fill="{c2}"/><polygon points="32,10 44,28 38,28 38,52 26,52 26,28 20,28" fill="{c1}"/><line x1="32" y1="4" x2="32" y2="56" stroke="#fff" stroke-width="1" opacity="0.3"/><circle cx="32" cy="16" r="2" fill="#fff" opacity="0.5"/>',
        'hand': f'<circle cx="32" cy="24" r="12" fill="{c2}"/><rect x="24" y="34" width="16" height="18" fill="{c1}" rx="4"/><circle cx="28" cy="22" r="3" fill="#fff"/><circle cx="36" cy="22" r="3" fill="#fff"/><circle cx="28" cy="22" r="1.5" fill="{c3}"/><circle cx="36" cy="22" r="1.5" fill="{c3}"/>',
        'hourglass': f'<polygon points="18,10 46,10 32,32 46,54 18,54 32,32" fill="none" stroke="{c2}" stroke-width="3"/><rect x="18" y="8" width="28" height="4" fill="{c1}"/><rect x="18" y="52" width="28" height="4" fill="{c1}"/><circle cx="32" cy="42" r="5" fill="{c2}"/><circle cx="32" cy="22" r="3" fill="{c2}" opacity="0.4"/><line x1="32" y1="32" x2="32" y2="38" stroke="{c2}" stroke-width="1"/>',
        'star': f'<polygon points="32,4 38,20 56,20 42,32 48,48 32,38 16,48 22,32 8,20 26,20" fill="{c2}"/><polygon points="32,10 36,22 48,22 38,30 42,42 32,34 22,42 26,30 16,22 28,22" fill="{c1}"/><circle cx="32" cy="26" r="4" fill="#fff" opacity="0.4"/><circle cx="32" cy="26" r="2" fill="#fff" opacity="0.6"/>',
        'shield': f'<path d="M32 6 L52 18 L52 40 L32 58 L12 40 L12 18 Z" fill="{c1}" stroke="{c2}" stroke-width="3"/><path d="M32 14 L44 22 L44 36 L32 48 L20 36 L20 22 Z" fill="{c3}"/><path d="M32 22 L36 26 L36 32 L32 38 L28 32 L28 26 Z" fill="{c2}"/><circle cx="32" cy="30" r="3" fill="#fff" opacity="0.4"/>',
        'gem': f'<polygon points="32,6 52,22 42,58 22,58 12,22" fill="{c2}"/><polygon points="32,14 46,24 38,52 26,52 18,24" fill="{c1}"/><line x1="32" y1="6" x2="32" y2="58" stroke="#fff" stroke-width="1" opacity="0.4"/><line x1="12" y1="22" x2="52" y2="22" stroke="#fff" stroke-width="1" opacity="0.3"/><polygon points="32,14 40,24 32,52" fill="#fff" opacity="0.08"/><circle cx="30" cy="22" r="2" fill="#fff" opacity="0.5"/>',
        'skull': f'<circle cx="32" cy="24" r="16" fill="{c1}"/><circle cx="25" cy="22" r="5" fill="{c3}"/><circle cx="39" cy="22" r="5" fill="{c3}"/><circle cx="25" cy="22" r="2" fill="{c1}"/><circle cx="39" cy="22" r="2" fill="{c1}"/><rect x="26" y="38" width="12" height="8" fill="{c1}" rx="2"/><line x1="30" y1="38" x2="30" y2="46" stroke="{c3}" stroke-width="1"/><line x1="34" y1="38" x2="34" y2="46" stroke="{c3}" stroke-width="1"/>',
        'scales': f'<rect x="30" y="10" width="4" height="38" fill="{c2}"/><rect x="14" y="10" width="36" height="4" fill="{c1}" rx="1"/><circle cx="18" cy="26" r="8" fill="{c1}" stroke="{c2}" stroke-width="1.5"/><circle cx="46" cy="26" r="8" fill="{c1}" stroke="{c2}" stroke-width="1.5"/><rect x="26" y="48" width="12" height="4" fill="{c2}" rx="1"/><circle cx="18" cy="26" r="3" fill="{c2}" opacity="0.4"/>',
        'trophy': f'<rect x="22" y="16" width="20" height="20" fill="{c2}" rx="8"/><rect x="26" y="36" width="12" height="6" fill="{c1}"/><rect x="22" y="42" width="20" height="4" fill="{c2}" rx="1"/><circle cx="32" cy="24" r="4" fill="#fff" opacity="0.3"/><rect x="14" y="18" width="8" height="4" fill="{c2}" rx="2"/><rect x="42" y="18" width="8" height="4" fill="{c2}" rx="2"/>',
    }
    shape = shapes.get(theme, shapes['trophy'])

    # Add glow filter for tier 3+
    glow_filter = f'<defs><filter id="glow"><feGaussianBlur stdDeviation="{blur}" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
    frame = f'<circle cx="32" cy="32" r="30" fill="#1a1a1a" stroke="{c2}" stroke-width="2"/><circle cx="32" cy="32" r="28" fill="none" stroke="{c1}" stroke-width="1" opacity="0.4"/><circle cx="32" cy="32" r="26" fill="none" stroke="{c2}" stroke-width="0.5" opacity="{glow_opacity}" filter="url(#glow)"/>'

    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">{glow_filter}{frame}{shape}</svg>'


def count_svg_elements(svg):
    """Count SVG child elements (not counting <svg>, <defs>, <filter>, <feMerge>)."""
    tags = re.findall(r'<(?!svg|/svg|defs|/defs|filter|/filter|feMerge\b|/feMerge|feMergeNode|feGaussianBlur)(\w+)', svg)
    return len(tags)


# ---- MAIN ----

# 1. Get all achievements
cur.execute('''SELECT a.id, a.name, a.threshold_value, a.parent_achievement_id, a.category, a.icon_sprite_key
FROM achievements a ORDER BY a.id''')
all_achs = cur.fetchall()

# Build chain map: find root of each chain, then order by threshold
# parent_achievement_id forms a linked list, not a tree with shared parent
# Build chains by following parent links
id_to_ach = {a[0]: a for a in all_achs}
# Find roots (achievements that ARE parents but have no parent themselves, or are pointed to)
parent_ids = {a[3] for a in all_achs if a[3] is not None}
roots = [a for a in all_achs if a[0] in parent_ids and a[3] is None]
# Also include roots that are parents in a chain
# For linked-list chains: root -> child -> grandchild...
chains = {}  # root_id -> [ach1, ach2, ...] ordered by threshold

for root in roots:
    chain = [root]
    # Find who has parent = root
    current_id = root[0]
    while True:
        child = None
        for a in all_achs:
            if a[3] == current_id:
                child = a
                break
        if child is None:
            break
        chain.append(child)
        current_id = child[0]
    chains[root[0]] = chain

print(f"Found {len(chains)} tier chains")
for root_id, chain in chains.items():
    print(f"  Chain '{chain[0][1]}': {len(chain)} tiers, category={chain[0][4]}")

# 2. Generate and apply SVGs
update_count = 0
for root_id, chain in chains.items():
    category = chain[0][4]  # e.g., 'combat', 'narrative', 'economics'

    for tier_idx, ach in enumerate(chain):
        tier = tier_idx + 1  # 1-based
        icon_key = ach[5]    # icon_sprite_key
        theme = get_theme(icon_key)

        svg = make_svg(theme, tier, category)
        elem_count = count_svg_elements(svg)

        # Verify minimum element counts
        if tier == 1 and elem_count < 4:
            print(f"WARNING: {icon_key} tier {tier} has only {elem_count} elements!")
        elif tier == 2 and elem_count < 6:
            print(f"WARNING: {icon_key} tier {tier} has only {elem_count} elements!")
        elif tier >= 3 and elem_count < 8:
            print(f"WARNING: {icon_key} tier {tier} has only {elem_count} elements!")

        # Update asset_registry
        svg_escaped = svg.replace("'", "''")
        cur.execute("""
            UPDATE asset_registry
            SET render_definition = jsonb_set(render_definition, '{svg_template}', to_jsonb(%s::text))
            WHERE asset_key = %s AND category = 'achievement_icon'
        """, (svg, icon_key))

        if cur.rowcount > 0:
            update_count += 1
        else:
            print(f"  No asset_registry row for {icon_key}, skipping")

conn.commit()
print(f"\nUpdated {update_count} achievement icons across {len(chains)} tier chains")

# 3. Verification: print 2 sample chains with element counts
sample_chains = list(chains.items())[:2]
print("\n=== VERIFICATION ===")
for root_id, chain in sample_chains:
    category = chain[0][4]
    print(f"\nChain: {chain[0][1]} ({category})")
    for tier_idx, ach in enumerate(chain):
        tier = tier_idx + 1
        icon_key = ach[5]
        theme = get_theme(icon_key)
        svg = make_svg(theme, tier, category)
        elem_count = count_svg_elements(svg)
        svg_len = len(svg)
        print(f"  Tier {tier} ({icon_key}): {elem_count} elements, {svg_len} chars")

cur.close()
conn.close()
print("\nDone!")
