import { tier3Ability } from './visual-tier3-content.js';
import { arcHeight, motion, sweep } from './visual-kit-timeline.js';

export const SA_NGO_TINH = { id: 'h00K', skill: tier3Ability('h00K').id, recipients: 3 } as const;
export const CHANT_SECONDS = .85, BLESSING_SECONDS = .7;
export const SA_CAPS = { charges: 8, chants: 8, flights: 24, blessings: 24 } as const;

/** Resolved ally positions only: no range/health selection and no fallback at caster or aim. */
export function recipientPositions<T extends { x: number; y: number; z: number }>(points: readonly T[]): T[] {
  return points.filter(p => [p.x, p.y, p.z].every(Number.isFinite)).slice(0, SA_NGO_TINH.recipients);
}

export function sandCharge(age: number, windup: number, reduced: boolean) {
  const power = sweep(age, 0, windup);
  return { power, frame: reduced ? 2 : Math.min(3, Math.floor(power * 4)),
    scale: reduced ? .9 : .65 + .35 * motion.anticipate(power), alpha: .3 + .55 * power };
}

export function guidanceSeconds(distance: number): number {
  return Math.max(.2, Math.min(.5, .18 + Math.max(0, distance) * .035));
}

/** One moving bead strand, then one arrival; this clock never creates a ward. */
export function guidancePose(age: number, duration: number) {
  const t = sweep(age, 0, duration);
  return { progress: motion.launch(t), lift: arcHeight(t, .6), arrived: t >= 1 };
}

type Bounds = { left: number; right: number; top: number; bottom: number };
/** The preserved source has its leading skull at LEFT; +X movement needs reversed U. */
export function guidanceStrip(distance: number, progress: number, bounds: Bounds) {
  const fullSpan = Math.min(3.4, Math.max(0, distance));
  const reveal = fullSpan > 0 ? sweep(distance * progress, 0, fullSpan) : 0;
  return { reveal, span: fullSpan * reveal,
    height: fullSpan * (bounds.bottom - bounds.top) / (bounds.right - bounds.left) };
}

/** Reveal only the leading source fraction while retaining the strand's natural height. */
export function guidanceUvs(base: readonly number[], reveal: number, bounds: Bounds): number[] {
  const fraction = Math.max(0, Math.min(1, reveal));
  return base.map((v, k) => k % 2 === 0
    ? bounds.left + (1 - v) * (bounds.right - bounds.left) * fraction
    : 1 - bounds.bottom + v * (bounds.bottom - bounds.top));
}

export function chantPose(age: number, reduced: boolean) {
  return { frame: reduced ? 6 : Math.min(15, 4 + Math.floor(age / CHANT_SECONDS * 12)),
    alpha: 1 - sweep(age, CHANT_SECONDS - .28, .28),
    scale: reduced ? 1 : .9 + .1 * motion.settle(age / .22) };
}

export function blessingPose(age: number, reduced: boolean) {
  const progress = sweep(age, 0, BLESSING_SECONDS);
  return { pillar: reduced ? 2 : Math.min(7, Math.floor(progress * 8)),
    quicken: reduced ? 3 : Math.min(7, Math.floor(progress * 8)),
    alpha: 1 - sweep(age, BLESSING_SECONDS - .2, .2),
    scale: reduced ? 1 : .86 + .14 * motion.impactOvershoot(age / .25) };
}
