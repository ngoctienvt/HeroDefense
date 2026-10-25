import { TRUONG_DAO_LANG as B } from '../../../content/truong-dao-lang-design.js';
import { fadeOut, motion, segmentFrame, sweep } from './visual-kit-timeline.js';

export const ARRAY_VISUAL_SCALE = .75;
export const ARRAY_PLANE_SIZE = 27 * ARRAY_VISUAL_SCALE;
export const ARRAY_PLANE_HEIGHT = 5.25 * ARRAY_VISUAL_SCALE;
/** The painted seal rim sits at .82 of the plane half-size: the ground seal spans the full server radius. */
export const SEAL_GROUND_SIZE = B.radius * 2 / .82;
/** Swords hover this far above their planted pose while the windup gathers them. */
export const ARRAY_RISE = 2.4;
/** Hold alpha: swords stay over the monsters (user choice) but frozen targets still read through them. */
export const ARRAY_HOLD_ALPHA = .72;
const ARRAY_SLAM = .26;
const EXIT = .35;

const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));
export type Pose = { lift: number; alpha: number };

/** Age of a zone first seen with `remaining` left: a late snapshot or reconnect joins the hold, not a replayed slam. */
export const zoneStartAge = (remaining: number): number => Math.max(0, B.freezeSeconds - remaining);
export const zoneAlpha =(remaining: number): number => clamp01(remaining / EXIT);
export const boltAlpha = (age: number, life: number): number => fadeOut(age, life * .45, life * .55);
export const charge = (age: number, windup: number): number => clamp01(age / Math.max(.05, windup));

export function arrayFrame(remaining: number, reduced: boolean, elapsed = 0): number {
  if (reduced) return 10;
  const age = Math.max(elapsed, B.freezeSeconds - remaining);
  if (age < .32) return segmentFrame(age, 4, 4, .08);
  if (remaining < EXIT) return segmentFrame(EXIT - remaining, 12, 4, .0875);
  return 8 + Math.floor(age * 6) % 4;
}
export const boltHitFrame = (age: number): number => segmentFrame(age, 0, 8, .055);

/** Windup: the five swords gather high above the field, sinking a little as the charge peaks. */
export function castArrayPose(age: number, windup: number, reduced: boolean): Pose {
  const c = charge(age, windup);
  if (reduced) return { lift: 0, alpha: .6 };
  return { lift: ARRAY_RISE * (1 - .25 * motion.anticipate(c)), alpha: .35 + .6 * c };
}

/** Zone: slam down with overshoot → hold (thinner so frozen monsters read) → lift away and fade on exit. */
export function zoneArrayPose(age: number, remaining: number, reduced: boolean): Pose {
  if (reduced) return { lift: 0, alpha: .6 * zoneAlpha(remaining) };
  const slam = age < ARRAY_SLAM ? ARRAY_RISE * .75 * (1 - motion.impactOvershoot(age / ARRAY_SLAM)) : 0;
  const hold = ARRAY_HOLD_ALPHA + (.95 - ARRAY_HOLD_ALPHA) * fadeOut(age, ARRAY_SLAM, .3);
  const exit = remaining < EXIT ? 1 - remaining / EXIT : 0;
  return { lift: slam + 3 * motion.launch(exit), alpha: hold * (1 - exit) };
}

/** Ground seal: grows in and spins up during the windup, then turns slowly while the zone holds. */
export function sealPose(age: number, windup: number, zoneRemaining?: number): { scale: number; spin: number; alpha: number } {
  if (zoneRemaining !== undefined) return { scale: 1, spin: .9 * windup + .35 * age, alpha: .7 * zoneAlpha(zoneRemaining) };
  const c = charge(age, windup);
  return { scale: .6 + .4 * motion.settle(c), spin: .9 * age, alpha: .25 + .5 * c };
}

/** Black-ice crust of the frozen area: spreads from the centre on impact, shatters as the zone ends. */
export const iceSpread = (age: number): number => Math.max(.06, motion.easeOut(age / .45));
export const iceShatter = (remaining: number): number => clamp01(1 - remaining / EXIT);

/** Fraction of a strike already drawn: the head races down from the sky in the first third of its life. */
export function boltReach(age: number, life: number): number {
  const t = sweep(age, 0, life * .3);
  return 1 - (1 - t) * (1 - t);
}

/**
 * UVs for the horizontal lightning strip (head at u=1) on an upright plane: the head points to the
 * ground and only the leading `reach` of the strip is shown, so the strike grows downward without stretching.
 */
export function boltUvs(base: readonly number[], reach: number): number[] {
  const r = clamp01(reach), out: number[] = [];
  for (let i = 0; i < base.length; i += 2) out.push(1 - r * base[i + 1], base[i]);
  return out;
}

/** Resolve the server's ordered chain, never rebuilding nearest-neighbour targets on the client. */
export function truongChainTargets<T>(event: { skillId?: string; targets?: string[]; target?: string },
  resolve: (id: string) => T | undefined): T[] | undefined {
  if (event.skillId !== 'trait-h040') return undefined;
  const ids = event.targets?.length ? event.targets : event.target ? [event.target] : [];
  return ids.slice(0, B.chainTargets).flatMap(id => {
    const target = resolve(id);
    return target === undefined ? [] : [target];
  });
}
