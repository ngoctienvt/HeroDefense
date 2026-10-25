import { fadeOut, motion, segmentFrame, sweep } from './visual-kit-timeline.js';

/**
 * Pure timing for the data-driven recipes (tier 1–2). No Babylon imports so it is testable.
 * Every call picks a `motion.*` preset; nothing here interpolates linearly by hand.
 */

/** Ribbon bolt / thrust / chain: head races out (ease-out), tail catches up (accelerates), then fades. */
export const STREAK_LIFE = .28;

export function streakSweep(age: number, life = STREAK_LIFE): { head: number; tail: number; alpha: number } {
  return {
    head: motion.settle(sweep(age, 0, life * .55)),
    tail: motion.launch(sweep(age, life * .3, life * .7)),
    alpha: fadeOut(age, life * .75, life * .25),
  };
}

/** Expanding ground ring: quick overshoot-free growth, then fades. `scale` is the fraction of the final radius. */
export function ringState(age: number, life: number): { scale: number; alpha: number } {
  return { scale: .25 + .75 * motion.easeOut(sweep(age, 0, life * .4)), alpha: fadeOut(age, life * .35, life * .65) };
}

/** A decal that stays at full radius (cracks, scorch) and cools out in the last third. */
export function holdState(age: number, life: number): { scale: number; alpha: number } {
  return { scale: .85 + .15 * motion.settle(sweep(age, 0, .2)), alpha: fadeOut(age, life * .6, life * .4) };
}

/** Flipbook frame of an atlas of `frames` cells played `perFrame` seconds each; `done` once the last frame is over. */
export function flipState(age: number, frames: number, perFrame: number): { frame: number; done: boolean } {
  return { frame: segmentFrame(age, 0, frames, perFrame), done: age >= frames * perFrame };
}

/** Sprite size over its life: pops with overshoot then settles (impact reads as force, not a fade-in). */
export function flipScale(age: number, life: number): number {
  return Math.max(.01, motion.impactOvershoot(sweep(age, 0, Math.min(.12, life * .3))));
}

/** Standing aura shell: always faintly visible, flashes when a pulse lands then settles back. */
export function auraShellAlpha(sincePulse: number): number {
  return .38 + .5 * motion.settle(1 - sweep(sincePulse, 0, .35));
}

/** Height of a falling petal/rock: accelerates toward the ground (motion.launch). */
export function fallHeight(t: number, from: number): number {
  return from * (1 - motion.launch(Math.max(0, Math.min(1, t))));
}

/** Last hit position per caster, so a bounce ribbon starts where the previous strike landed. */
export interface HitPoint { x: number; z: number; time: number }

export function previousHit(memory: Map<string, HitPoint>, source: string, at: { x: number; z: number },
  now: number, window = .6): HitPoint | undefined {
  const last = memory.get(source);
  memory.set(source, { x: at.x, z: at.z, time: now });
  return last && now - last.time <= window ? last : undefined;
}

/** True at most once per `interval` per source (aura events arrive once per enemy per tick). */
export function pulseGate(memory: Map<string, number>, source: string, now: number, interval: number): boolean {
  const last = memory.get(source);
  if (last !== undefined && now - last < interval) return false;
  memory.set(source, now);
  return true;
}

/** Crescent plane size (kitSlash puts the band at r=.87 of the half-size) so the arc sits on `reach`. */
export function slashPlaneSize(reach: number): number {
  return reach * .87 / .78 * 2;
}

/** Half-angle of a frontal cleave in radians, clamped to what kitSlash can draw. */
export function slashArc(angle: number): number {
  return Math.min(1.72, Math.max(.4, angle / 2));
}
