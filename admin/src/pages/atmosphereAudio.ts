import { useRef, useCallback } from 'react'

/* ------------------------------------------------------------------ */
/* Note → Frequency                                                    */
/* ------------------------------------------------------------------ */

export function noteToFreq(note: string): number {
  const match = note.match(/^([A-G])(b|#)?(\d)$/)
  if (!match) return 440
  const [, letter, accidental, octaveStr] = match
  const noteMap: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  let semitone = noteMap[letter] ?? 9
  if (accidental === '#') semitone++
  else if (accidental === 'b') semitone--
  const octave = parseInt(octaveStr)
  const midi = (octave + 1) * 12 + semitone
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/* ------------------------------------------------------------------ */
/* Web Audio Preview (atmosphere music)                                */
/* ------------------------------------------------------------------ */

export function useAudioPreview() {
  const ctxRef = useRef<AudioContext | null>(null)
  const nodesRef = useRef<OscillatorNode[]>([])
  const playingRef = useRef(false)

  const stop = useCallback(() => {
    nodesRef.current.forEach(n => { try { n.stop() } catch {} })
    nodesRef.current = []
    playingRef.current = false
  }, [])

  const play = useCallback((definition: any) => {
    stop()
    if (!definition) return

    try {
      const ctx = ctxRef.current || new AudioContext()
      ctxRef.current = ctx
      if (ctx.state === 'suspended') ctx.resume()

      playingRef.current = true
      const nodes: OscillatorNode[] = []

      // Play melody if present
      const melody = definition.melody
      if (melody?.sequence) {
        let time = ctx.currentTime + 0.05
        const beatDur = 60 / (definition.bpm || 120)

        for (const step of melody.sequence) {
          if (step.note && playingRef.current) {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = (melody.oscillator || 'square') as OscillatorType
            osc.frequency.value = noteToFreq(step.note)
            gain.gain.value = melody.volume ?? 0.3
            osc.connect(gain)
            gain.connect(ctx.destination)
            const dur = (step.beats || 1) * beatDur
            osc.start(time)
            osc.stop(time + dur * 0.9)
            nodes.push(osc)
            time += dur
          } else {
            time += (step.beats || 1) * beatDur
          }
        }
      }

      // Play bass if present
      const bass = definition.bass
      if (bass?.sequence) {
        let time = ctx.currentTime + 0.05
        const beatDur = 60 / (definition.bpm || 120)

        for (const step of bass.sequence) {
          if (step.note) {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = (bass.oscillator || 'triangle') as OscillatorType
            osc.frequency.value = noteToFreq(step.note)
            gain.gain.value = bass.volume ?? 0.2
            osc.connect(gain)
            gain.connect(ctx.destination)
            const dur = (step.beats || 1) * beatDur
            osc.start(time)
            osc.stop(time + dur * 0.9)
            nodes.push(osc)
            time += dur
          } else {
            time += (step.beats || 1) * beatDur
          }
        }
      }

      nodesRef.current = nodes
    } catch (e) {
      console.error('Preview error:', e)
    }
  }, [stop])

  const destroy = useCallback(() => {
    stop()
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {})
      ctxRef.current = null
    }
  }, [stop])

  return { play, stop, destroy }
}

/* ------------------------------------------------------------------ */
/* SFX Preview (used by SFXConfigEditor)                               */
/* ------------------------------------------------------------------ */

export function useSFXPreview() {
  const ctxRef = useRef<AudioContext | null>(null)

  const play = useCallback((preset: any, baseVolume = 0.6) => {
    try {
      const ctx = ctxRef.current || new AudioContext()
      ctxRef.current = ctx
      if (ctx.state === 'suspended') ctx.resume()

      const steps = Array.isArray(preset) ? preset : [preset]
      let offset = 0

      for (const step of steps) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = (step.oscillator_type || 'square') as OscillatorType
        const freqStart = step.frequency_start || 440
        const freqEnd = step.frequency_end || freqStart
        const dur = (step.duration_ms || 100) / 1000

        osc.frequency.setValueAtTime(freqStart, ctx.currentTime + offset)
        if (freqEnd !== freqStart) {
          osc.frequency.exponentialRampToValueAtTime(
            Math.max(freqEnd, 1), ctx.currentTime + offset + dur
          )
        }

        gain.gain.setValueAtTime(baseVolume, ctx.currentTime + offset)
        const release = (step.release_ms || 50) / 1000
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + offset + dur)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime + offset)
        osc.stop(ctx.currentTime + offset + dur + release)
        offset += dur
      }
    } catch (e) {
      console.error('SFX preview error:', e)
    }
  }, [])

  return { play }
}
