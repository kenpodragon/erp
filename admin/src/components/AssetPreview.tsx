import { useRef, useEffect } from 'react'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface AssetPreviewProps {
  category: string
  renderDefinition: any
  width?: number
  height?: number
}

/* ------------------------------------------------------------------ */
/* Render Helpers                                                      */
/* ------------------------------------------------------------------ */

function drawEntitySprite(ctx: CanvasRenderingContext2D, def: any, w: number, h: number) {
  const cx = w / 2
  const cy = h / 2
  const radius = Math.min(w, h) * 0.3

  // Aura
  const aura = def.features?.find((f: any) => f.type === 'aura')
  if (aura) {
    ctx.beginPath()
    ctx.arc(cx, cy, radius * 1.4, 0, Math.PI * 2)
    ctx.fillStyle = aura.color || '#ff000033'
    ctx.fill()
  }

  // Shadow
  if (def.shadow?.enabled) {
    ctx.beginPath()
    ctx.ellipse(cx, cy + radius * 1.1, radius * (def.shadow.scale_x || 1.2), radius * 0.2, 0, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(0,0,0,${def.shadow.opacity || 0.3})`
    ctx.fill()
  }

  // Base shape
  ctx.beginPath()
  if (def.base_shape === 'rect') {
    const rw = (def.width || radius * 2) * (w / 64)
    const rh = (def.height || radius * 2) * (h / 64)
    ctx.rect(cx - rw / 2, cy - rh / 2, rw, rh)
  } else {
    const r = (def.radius || 20) * (w / 64)
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
  }
  ctx.fillStyle = def.fill_color || '#aa44cc'
  ctx.fill()
  if (def.stroke_color) {
    ctx.strokeStyle = def.stroke_color
    ctx.lineWidth = def.stroke_width || 2
    ctx.stroke()
  }

  // Features
  if (Array.isArray(def.features)) {
    for (const feat of def.features) {
      if (feat.type === 'eyes') {
        const eyeR = (feat.radius || 3) * (w / 64)
        const spacing = radius * 0.4
        const ey = cy + (feat.offset_y || -5) * (h / 64)
        ctx.fillStyle = feat.color || '#ff0000'
        ctx.beginPath()
        ctx.arc(cx - spacing, ey, eyeR, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(cx + spacing, ey, eyeR, 0, Math.PI * 2)
        ctx.fill()
        if (feat.glow) {
          ctx.shadowColor = feat.color || '#ff0000'
          ctx.shadowBlur = 6
          ctx.beginPath()
          ctx.arc(cx - spacing, ey, eyeR * 0.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(cx + spacing, ey, eyeR * 0.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
        }
      } else if (feat.type === 'horns') {
        const hornH = (feat.height || 8) * (h / 64)
        const hy = cy + (feat.offset_y || -18) * (h / 64)
        ctx.fillStyle = feat.color || '#443322'
        for (const dx of [-radius * 0.5, radius * 0.5]) {
          ctx.beginPath()
          ctx.moveTo(cx + dx - 4, hy + hornH)
          ctx.lineTo(cx + dx, hy)
          ctx.lineTo(cx + dx + 4, hy + hornH)
          ctx.closePath()
          ctx.fill()
        }
      }
    }
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, def: any, w: number, h: number) {
  // Gradient
  if (def.gradient) {
    const grad = def.gradient
    const isVertical = grad.direction !== 'horizontal'
    const lg = isVertical
      ? ctx.createLinearGradient(0, 0, 0, h)
      : ctx.createLinearGradient(0, 0, w, 0)
    if (Array.isArray(grad.stops)) {
      for (const stop of grad.stops) {
        lg.addColorStop(stop.offset ?? 0, stop.color ?? '#000')
      }
    }
    ctx.fillStyle = lg
    ctx.fillRect(0, 0, w, h)
  } else {
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, w, h)
  }

  // Elements
  if (Array.isArray(def.elements)) {
    for (const el of def.elements) {
      if (el.type === 'stars') {
        const count = Math.min(el.count || 20, 50)
        ctx.fillStyle = el.color || '#ffffff44'
        for (let i = 0; i < count; i++) {
          const sx = (Math.sin(i * 137.5) * 0.5 + 0.5) * w
          const sy = (Math.cos(i * 97.3) * 0.5 + 0.5) * h
          const sr = (el.min_radius || 1) + Math.random() * ((el.max_radius || 2) - (el.min_radius || 1))
          ctx.beginPath()
          ctx.arc(sx, sy, sr, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (el.type === 'cloud') {
        ctx.fillStyle = el.color || '#22224433'
        const count = Math.min(el.count || 3, 8)
        for (let i = 0; i < count; i++) {
          const cx = (i / count) * w + w * 0.1
          const yRange = el.y_range || [10, 50]
          const cy = yRange[0] + (yRange[1] - yRange[0]) * (i / count)
          const cw = ((el.width_range?.[0] || 40) + (el.width_range?.[1] || 100)) / 2 * (w / 512)
          const ch = ((el.height_range?.[0] || 15) + (el.height_range?.[1] || 30)) / 2 * (h / 150)
          ctx.beginPath()
          ctx.ellipse(cx, cy * (h / 150), cw, ch, 0, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (el.type === 'buildings' || el.type === 'structures') {
        ctx.fillStyle = el.color || '#11112244'
        const count = Math.min(el.count || 5, 10)
        for (let i = 0; i < count; i++) {
          const bw = w / count * 0.6
          const bh = h * (0.2 + Math.sin(i * 2.3) * 0.15)
          const bx = (i / count) * w
          ctx.fillRect(bx, h - bh, bw, bh)
        }
      }
    }
  }
}

function drawAvatar(ctx: CanvasRenderingContext2D, def: any, w: number, h: number) {
  const cx = w / 2
  const cy = h / 2

  // Background
  ctx.fillStyle = def.background_color || '#1a1a2e'
  ctx.fillRect(0, 0, w, h)

  // Border
  if (def.border) {
    ctx.beginPath()
    ctx.arc(cx, cy, Math.min(w, h) / 2 - 2, 0, Math.PI * 2)
    ctx.strokeStyle = def.border.color || '#7b5ea7'
    ctx.lineWidth = def.border.width || 3
    ctx.stroke()
  }

  // Face
  if (def.face) {
    const fw = (def.face.width || 60) * (w / 128)
    const fh = (def.face.height || 70) * (h / 128)
    ctx.beginPath()
    ctx.ellipse(cx, cy, fw / 2, fh / 2, 0, 0, Math.PI * 2)
    ctx.fillStyle = def.face.fill_color || '#ddccbb'
    ctx.fill()
  }

  // Eyes
  if (def.eyes) {
    const eyeSize = (def.eyes.size || 8) * (w / 128)
    const spacing = (def.eyes.spacing || 20) * (w / 128) / 2
    const ey = cy - (h * 0.05)
    ctx.fillStyle = def.eyes.color || '#3388ff'
    ctx.beginPath()
    ctx.ellipse(cx - spacing, ey, eyeSize / 2, eyeSize / 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(cx + spacing, ey, eyeSize / 2, eyeSize / 3, 0, 0, Math.PI * 2)
    ctx.fill()
    if (def.eyes.glow) {
      ctx.shadowColor = def.eyes.color || '#3388ff'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(cx - spacing, ey, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(cx + spacing, ey, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }
  }

  // Features (mask, etc.)
  if (Array.isArray(def.features)) {
    for (const feat of def.features) {
      if (feat.type === 'mask') {
        ctx.fillStyle = feat.color || '#eeeeee'
        ctx.globalAlpha = feat.opacity || 0.9
        const my = cy + (feat.offset_y || 10) * (h / 128)
        ctx.beginPath()
        ctx.ellipse(cx, my, w * 0.2, h * 0.1, 0, 0, Math.PI)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }
  }
}

function drawIcon(ctx: CanvasRenderingContext2D, def: any, w: number, h: number) {
  const cx = w / 2
  const cy = h / 2
  const pad = 2

  // Background shape
  const bg = def.background
  if (bg) {
    const cr = bg.corner_radius ? Math.min(bg.corner_radius, w / 4) : 0
    ctx.beginPath()
    if (bg.shape === 'circle') {
      ctx.arc(cx, cy, w / 2 - pad, 0, Math.PI * 2)
    } else {
      // rounded rect
      roundRect(ctx, pad, pad, w - pad * 2, h - pad * 2, cr)
    }
    ctx.fillStyle = bg.fill_color || '#1a1a2e'
    ctx.fill()
    if (bg.stroke_color) {
      ctx.strokeStyle = bg.stroke_color
      ctx.lineWidth = bg.stroke_width || 2
      ctx.stroke()
    }
  } else {
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(pad, pad, w - pad * 2, h - pad * 2)
  }

  // Symbol
  const sym = def.symbol
  if (sym) {
    const ss = (sym.size || 24) * (w / 64)
    ctx.fillStyle = sym.fill_color || '#7b5ea7'
    if (sym.shape === 'diamond') {
      ctx.beginPath()
      ctx.moveTo(cx, cy - ss / 2)
      ctx.lineTo(cx + ss / 2, cy)
      ctx.lineTo(cx, cy + ss / 2)
      ctx.lineTo(cx - ss / 2, cy)
      ctx.closePath()
      ctx.fill()
    } else if (sym.shape === 'star') {
      drawStar(ctx, cx, cy, ss / 2, ss / 4, 5)
      ctx.fill()
    } else if (sym.shape === 'circle') {
      ctx.beginPath()
      ctx.arc(cx, cy, ss / 2, 0, Math.PI * 2)
      ctx.fill()
    } else if (sym.shape === 'triangle') {
      ctx.beginPath()
      ctx.moveTo(cx, cy - ss / 2)
      ctx.lineTo(cx + ss / 2, cy + ss / 2)
      ctx.lineTo(cx - ss / 2, cy + ss / 2)
      ctx.closePath()
      ctx.fill()
    } else {
      // Default: square
      ctx.fillRect(cx - ss / 2, cy - ss / 2, ss, ss)
    }
    if (sym.stroke_color) {
      ctx.strokeStyle = sym.stroke_color
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  // Rarity border (use first available)
  const rb = def.rarity_border
  if (rb) {
    const color = rb.rare || rb.common || '#888888'
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, w - 2, h - 2)
  }
}

function drawPlaceholder(ctx: CanvasRenderingContext2D, category: string, w: number, h: number) {
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = '#444'
  ctx.lineWidth = 1
  ctx.strokeRect(1, 1, w - 2, h - 2)
  ctx.fillStyle = '#666'
  ctx.font = `${Math.max(8, w * 0.15)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const label = category.replace(/_/g, '\n')
  const lines = label.split('\n')
  const lineH = Math.max(10, w * 0.18)
  const startY = h / 2 - ((lines.length - 1) * lineH) / 2
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], w / 2, startY + i * lineH)
  }
}

/* ------------------------------------------------------------------ */
/* Canvas Utility                                                      */
/* ------------------------------------------------------------------ */

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, innerR: number, points: number) {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = (i * Math.PI) / points - Math.PI / 2
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

/* ------------------------------------------------------------------ */
/* Icon Categories Set                                                 */
/* ------------------------------------------------------------------ */

const ICON_CATEGORIES = new Set([
  'item_icon', 'artifact_icon', 'achievement_icon', 'skill_icon', 'ui_icon',
])

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function AssetPreview({ category, renderDefinition, width = 64, height = 64 }: AssetPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear
    ctx.clearRect(0, 0, width, height)

    // Empty / null definition -> gray placeholder
    if (!renderDefinition || (typeof renderDefinition === 'object' && Object.keys(renderDefinition).length === 0)) {
      drawPlaceholder(ctx, category || 'unknown', width, height)
      return
    }

    const def = renderDefinition

    if (category === 'entity_sprite' || category === 'class_sprite') {
      drawEntitySprite(ctx, def, width, height)
    } else if (category === 'background') {
      drawBackground(ctx, def, width, height)
    } else if (category === 'avatar') {
      drawAvatar(ctx, def, width, height)
    } else if (ICON_CATEGORIES.has(category)) {
      drawIcon(ctx, def, width, height)
    } else {
      drawPlaceholder(ctx, category, width, height)
    }
  }, [category, renderDefinition, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width, height, borderRadius: 4, background: '#0a0a15' }}
    />
  )
}
