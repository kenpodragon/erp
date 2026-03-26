/**
 * useCombatAnimations — animation lifecycle hook.
 * Manages damage numbers, death particles, shockwaves, screen shake,
 * recoil, hit flash, and CPS tracking via useTick.
 */
import { useState, useRef, useCallback } from 'react';
import { useTick } from '@pixi/react';

export interface DamageNumber {
  id: string;
  x: number;
  y: number;
  value: string;
  type: 'normal' | 'crit' | 'auto' | 'burst';
  alpha: number;
  vy: number;
}

export interface DeathParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: number;
}

export interface Shockwave {
  id: string;
  x: number;
  y: number;
  alpha: number;
  radius: number;
}

export function useCombatAnimations(reduceMotion: boolean) {
  const [dmgNumbers, setDmgNumbers] = useState<DamageNumber[]>([]);
  const [deathParticles, setDeathParticles] = useState<DeathParticle[]>([]);
  const [shockwaves, setShockwaves] = useState<Shockwave[]>([]);
  const [shake, setShake] = useState(0);
  const [recoil, setRecoil] = useState(0);
  const [hitFlash, setHitFlash] = useState(false);
  const [time, setTime] = useState(0);
  const [cps, setCps] = useState(0);
  const [playerAttackActive, setPlayerAttackActive] = useState(false);
  const [autoAttackActive, setAutoAttackActive] = useState(false);

  const clickTimesRef = useRef<number[]>([]);

  const triggerShake = useCallback(() => {
    if (reduceMotion) return;
    setShake(1); setTimeout(() => setShake(0), 400);
  }, [reduceMotion]);

  const triggerRecoil = useCallback(() => {
    if (reduceMotion) return;
    setRecoil(1); setTimeout(() => setRecoil(0), 150);
  }, [reduceMotion]);

  const triggerHitFlash = useCallback(() => {
    if (reduceMotion) return;
    setHitFlash(true); setTimeout(() => setHitFlash(false), 80);
  }, [reduceMotion]);

  const addDmgNumber = useCallback((x: number, y: number, value: string, type: DamageNumber['type']) => {
    if (reduceMotion) return;
    setDmgNumbers(prev => [...prev.slice(-12), {
      id: `${Date.now()}_${Math.random()}`, x, y, value, type, alpha: 1.0, vy: -1.2,
    }]);
  }, [reduceMotion]);

  const addDeathParticles = useCallback((x: number, y: number, color: number) => {
    if (reduceMotion) return;
    setDeathParticles(old => [...old, ...Array.from({ length: 15 }, (_, i) => ({
      id: `dp_${Date.now()}_${i}`, x, y,
      vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
      alpha: 1.0, size: 2 + Math.random() * 4, color,
    }))]);
  }, [reduceMotion]);

  const addShockwave = useCallback((x: number, y: number) => {
    if (reduceMotion) return;
    setShockwaves(prev => [...prev.slice(-5), {
      id: `sw_${Date.now()}_${Math.random()}`, x, y, alpha: 0.6, radius: 5,
    }]);
  }, [reduceMotion]);

  useTick((delta) => {
    const dt = delta.deltaTime;
    setTime(prev => prev + 0.05 * dt);
    const now = Date.now();
    clickTimesRef.current = clickTimesRef.current.filter(t => now - t < 1000);
    const realCps = clickTimesRef.current.length;
    if (cps > realCps) setCps(prev => Math.max(realCps, prev - 0.1 * dt));
    setDmgNumbers(prev => prev.map(d => ({ ...d, y: d.y + d.vy * dt, alpha: d.alpha - 0.015 * dt })).filter(d => d.alpha > 0));
    setDeathParticles(prev => prev.map(p => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, vx: p.vx * 0.96, vy: p.vy * 0.96, alpha: p.alpha - 0.03 * dt })).filter(p => p.alpha > 0));
    setShockwaves(prev => prev.map(s => ({ ...s, radius: s.radius + 4 * dt, alpha: s.alpha - 0.05 * dt })).filter(s => s.alpha > 0));
  });

  return {
    dmgNumbers, deathParticles, shockwaves,
    shake, recoil, hitFlash, time,
    cps, setCps,
    playerAttackActive, setPlayerAttackActive,
    autoAttackActive, setAutoAttackActive,
    clickTimesRef,
    triggerShake, triggerRecoil, triggerHitFlash,
    addDmgNumber, addDeathParticles, addShockwave,
  };
}
