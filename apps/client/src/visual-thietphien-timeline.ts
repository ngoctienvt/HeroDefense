/**
 * Pure timing and geometry for Thiết Phiến (h00B) "Ba Tiêu Cuồng Phong Toàn" (no Babylon imports, testable).
 * Art: assets/vfx-source/thietphien (Codex-painted, prompts/). Flipbook `thietphien-storm` (16 frames): 0-1 sand
 * lifts during the server windup, 2-15 the cyclone ring grows, roars and settles after the ability. Ground
 * decal `fan-arc` = the banana-leaf fan sweeping from her hand; strip `sand-gust` flies hand → storm centre;
 * `thietphien-hit` = blow-back puff on every enemy hit; `thietphien-ignite` = the fire detonation on enemies
 * the server just set alight (Thiết Phiến only ever burns enemies by detonating, combat.ts).
 */
import { motion, piecewise, segmentFrame, sweep } from './visual-kit-timeline.js';

export const THIETPHIEN_ID = 'h00B';
export const THIETPHIEN_SKILL = `skill-${THIETPHIEN_ID}`;
export const THIETPHIEN_ATLAS = { storm: 'thietphien-storm', hit: 'thietphien-hit', ignite: 'thietphien-ignite' } as const;
export const FAN_ARC_URL = '/assets/vfx-thietphien-fan-arc.webp';
export const SAND_GUST_URL = '/assets/vfx-thietphien-sand-gust.webp';

/** catalog.ts skill-h00B effect.radius; combat.ts hits a cone of this radius or a circle around a far target. */
export const SKILL_RADIUS = 4.5;
/** combat.ts tier-2 cleave keeps enemies with cos(angle to the target direction) >= .25 (about 151 degrees). */
export const CONE_MIN_COS = .25;
/** Server windup when a cast event carries none (combat.ts WINDUP_SECONDS). */
export const DEFAULT_WINDUP = .25;

export interface SkillZone {
  readonly kind: 'cone' | 'circle';
  readonly center: { x: number; z: number };
  /** Unit vector caster → target. */
  readonly dir: { x: number; z: number };
  readonly radius: number;
}

/**
 * Mirrors combat.ts: a target farther than `SKILL_RADIUS` from the caster centres a circle on the target;
 * a nearer one makes a forward cone from the caster, drawn as a circle centred ahead so the storm stays inside.
 */
export function skillZone(origin: { x: number; z: number }, target: { x: number; z: number }): SkillZone {
  const dx = target.x - origin.x, dz = target.z - origin.z;
  const distance = Math.hypot(dx, dz);
  const dir = distance < .01 ? { x: 0, z: 1 } : { x: dx / distance, z: dz / distance };
  if (distance > SKILL_RADIUS) return { kind: 'circle', center: { x: target.x, z: target.z }, dir, radius: SKILL_RADIUS };
  const ahead = SKILL_RADIUS * .42; // front edge stays at the cone's reach; the sides are narrower than the 150 degree cone
  return { kind: 'cone', center: { x: origin.x + dir.x * ahead, z: origin.z + dir.z * ahead }, dir,
    radius: SKILL_RADIUS - ahead };
}

/** True when `point` is struck by the skill's real area (tests keep this identical to combat.ts). */
export function insideSkillArea(origin: { x: number; z: number }, target: { x: number; z: number },
  point: { x: number; z: number }): boolean {
  const distance = Math.hypot(target.x - origin.x, target.z - origin.z);
  if (distance > SKILL_RADIUS) return Math.hypot(point.x - target.x, point.z - target.z) <= SKILL_RADIUS;
  const length = Math.hypot(point.x - origin.x, point.z - origin.z);
  if (length > SKILL_RADIUS) return false;
  if (length < .1) return true;
  const forward = Math.hypot(target.x - origin.x, target.z - origin.z) || 1;
  return ((target.x - origin.x) * (point.x - origin.x) + (target.z - origin.z) * (point.z - origin.z)) / (forward * length)
    >= CONE_MIN_COS;
}

/** Storm flipbook: frames 0-1 gather sand during the windup (held on 1), 2-15 play after the ability. */
export const STORM_FPS = 18;
export const STORM_AFTER_SECONDS = 14 / STORM_FPS;
export function stormGatherFrame(age: number, windup: number): number {
  return segmentFrame(age, 0, 2, Math.max(.04, windup) / 2);
}
export function stormBlowFrame(age: number): number { return 2 + segmentFrame(age, 0, 14, 1 / STORM_FPS); }
/** A cast whose ability never comes (cancelled / left the zone) gives up after this long. */
export const ORPHAN_SECONDS = 1.2;
/** Reduced motion: one still storm frame (the ring at full size outlines the area) for a short moment. */
export const STILL_STORM_FRAME = 7;
export const STILL_SECONDS = .45;

/** Fan arc decal: swings open from the hand over FAN_SWING, holds, fades; scale grows with the swing. */
export const FAN_SWING = .12;
export const FAN_LIFE = .42;
export const FAN_REACH = 3.4;
export function fanSwing(age: number): number { return motion.easeOut(sweep(age, 0, FAN_SWING)); }
export function fanScale(age: number): number { return .45 + .55 * fanSwing(age); }
export function fanAlpha(age: number): number {
  return Math.min(1, age / .04) * (1 - sweep(age, FAN_SWING + .08, FAN_LIFE - FAN_SWING - .08));
}
/** The fan rotates a little into the throw (radians, from the left of the throw direction to straight on). */
export function fanTurn(age: number): number { return -.55 * (1 - fanSwing(age)); }

/** Sand gust: flies from the hand through the storm centre, head first like the painted strip. */
export const GUST_EXTEND = .16;
export const GUST_LIFE = .46;
export const GUST_HEIGHT = 1;
export function gustReach(age: number): number { return motion.easeOut(sweep(age, 0, GUST_EXTEND)); }
export function gustAlpha(age: number): number { return 1 - sweep(age, GUST_EXTEND + .06, GUST_LIFE - GUST_EXTEND - .06); }
export function gustPlaneWidth(length: number): number { return Math.min(2.6, Math.max(1.3, length / 3)); }

/**
 * Blow-back hit puff on each enemy. The gust front reaches enemies in order of distance along the throw
 * (`GUST_SPEED` units/s), so a crowd is swept front to back instead of popping at once.
 */
export const GUST_SPEED = 26;
export const HIT_FPS = 20;
export const HIT_SECONDS = 8 / HIT_FPS;
export function hitFrame(age: number): number { return segmentFrame(age, 0, 8, 1 / HIT_FPS); }
export function hitDelay(alongThrow: number): number { return Math.min(.22, Math.max(0, alongThrow) / GUST_SPEED); }

/** Fire detonation flare on an enemy the server just set alight. */
export const IGNITE_FPS = 18;
export const IGNITE_SECONDS = 8 / IGNITE_FPS;
export function igniteFrame(age: number): number { return segmentFrame(age, 0, 8, 1 / IGNITE_FPS); }
/** Embers rise from a still-burning enemy at most once per this many seconds. */
export const EMBER_GATE = .4;
/** A burn whose remaining time jumps by more than this is a fresh detonation (3 s burn, combat.ts). */
export const IGNITE_JUMP = 1;
/** Kick the hit puff scale by crowd density so a packed lane stays readable. */
export function hitScale(count: number): number { return piecewise([[1, 1], [6, .8], [12, .62]], count); }
