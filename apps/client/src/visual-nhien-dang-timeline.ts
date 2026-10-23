import { NHIEN_DANG as N } from '../../../content/new-divine-design.js';
import { fadeOut, motion, sweep } from './visual-kit-timeline.js';

/**
 * Pure timing/layout for Nhiên Đăng Vạn Cổ Tịch Diệt Trận (h03W). No Babylon imports: testable.
 * Art measured by assets/vfx-source/nhien-dang/process-art.py (active-inventory.json). Everything here is
 * presentation; the server already resolved shields, slow and burn on its own clock.
 */

/** Server windup of skill-h03W when the cast event omits it. */
export const DEFAULT_WINDUP = N.windup;
/** A cast whose resolve never arrives (cancelled, caster died) is cleaned up this long after its windup. */
export const CAST_GRACE = .3;
export const CAGE_RADIUS = N.radius;
export const CAGE_SECONDS = N.duration;
/** Reflect hits every monster within this radius of the attacker (combat.ts hurt-reflect loop). */
export const REFLECT_RADIUS = 2.5;
/** A cage whose ground snapshot never shows up is dropped this long after its nominal duration. */
export const UNMARKED_GRACE = 1;

/** Pearl art: 718:1000 after cropping the Codex pearl to its painted bbox. */
export const PEARL_ASPECT = .7188;
export const PEARL_HEIGHT = 1.5;

/** Array decal: painted extent is .9394 of the half-size, so the decal edge lands on the R7 gameplay edge. */
export const ARRAY_EXTENT = .9394;
export const ARRAY_SIZE = CAGE_RADIUS * 2 / ARRAY_EXTENT;

/**
 * Centres of the 24 painted pearl markers, canvas-normalised (-1..1, y down): the first twelve are the inner ring, the
 * last twelve the outer ring (the manifest says 16 + 8; the measured art is 12 + 12).
 */
const MARKERS: readonly (readonly [number, number])[] = [
  [-0.6019, -0.1418], [-0.4607, -0.426], [-0.1984, -0.592], [0.191, -0.5924], [0.4531, -0.4258], [0.5974, -0.1423],
  [0.5981, 0.1167], [0.4548, 0.3943], [0.1902, 0.554], [-0.1978, 0.5536], [-0.4608, 0.3936], [-0.6026, 0.117],
  [-0.8207, -0.0201], [-0.7419, -0.4125], [-0.4433, -0.715], [-0.0023, -0.8372], [0.4348, -0.7157], [0.7342, -0.4122],
  [0.8163, -0.0203], [0.7341, 0.3739], [0.4363, 0.6765], [-0.0026, 0.7844], [-0.4419, 0.6775], [-0.7421, 0.3747],
];
export type Ring = 'inner' | 'outer';
export interface Slot { dx: number; dz: number; ring: Ring; order: number }
export const PEARL_COUNT = MARKERS.length;
/** World offsets from the cage centre (the plane's local +Y points to +Z, so image y is flipped). `order` runs 0..1 round the ring. */
export const SLOTS: readonly Slot[] = MARKERS.map(([x, y], i) => ({
  dx: x * ARRAY_SIZE / 2, dz: -y * ARRAY_SIZE / 2, ring: i < 12 ? 'inner' : 'outer',
  order: (Math.atan2(y, x) + Math.PI) / (Math.PI * 2),
}));

/** Lamp flame: 8 looping frames; the foot sits at .9658 of the canvas and the painted flame is .889 high. */
export const FLAME_FRAMES = 8, FLAME_FRAME_SECONDS = .09;
export const FLAME_SIZE = 2.1, FLAME_FOOT = .9658;

/** Screen-up height of a pearl's centre above its ground slot: lit at the windup, in the cage once resolved. */
export const CHARGE_LIFT = 1.1;
export const CAGE_LIFT: Readonly<Record<Ring, number>> = { inner: 3.3, outer: 2.9 };
export const LIFT_SECONDS = .25;
export const RELEASE_SECONDS = .35, DESCEND_SECONDS = .17, REST_LIFT = .55;
/** A cage about to expire flickers during its last moments. */
export const EXPIRY_WARNING = .6;

export interface PearlLook { lift: number; pull: number; scale: number; alpha: number; flameScale: number; flameAlpha: number }

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Windup: the lamps are lit one after another round the array, each pearl brightening and floating up a little. */
export function chargeLook(age: number, windup: number, slot: Slot, reduced: boolean): PearlLook {
  const lit = reduced ? 1 : sweep(age, slot.order * windup * .55, Math.max(.08, windup * .4));
  return {
    lift: CHARGE_LIFT + (reduced ? 0 : .25 * lit), pull: 0,
    scale: reduced ? 1 : motion.impactOvershoot(lit), alpha: reduced ? .9 : Math.min(1, .15 + lit * .85 * 1.6),
    flameScale: .55 * (reduced ? 1 : motion.impactOvershoot(sweep(age, slot.order * windup * .55, .18))),
    flameAlpha: reduced ? .9 : Math.min(1, lit * 3),
  };
}

/** Resolve: the pearls lift from their lamps into the cage (overshoot) while the flames flare to full height. */
export function liftLook(age: number, slot: Slot, reduced: boolean): PearlLook {
  const t = reduced ? 1 : sweep(age, slot.order * .06, LIFT_SECONDS);
  return {
    lift: lerp(CHARGE_LIFT + .25, CAGE_LIFT[slot.ring], motion.impactOvershoot(t)), pull: 0, scale: 1, alpha: 1,
    flameScale: lerp(.55, 1, motion.impactOvershoot(t)), flameAlpha: 1,
  };
}

/**
 * Resolved cage: the lift above, then a slow bob (fading in once the pearls have settled) and a flicker in the last
 * `EXPIRY_WARNING` seconds of the snapshot's `remaining`.
 */
export function activeLook(age: number, time: number, slot: Slot, remaining: number | undefined, reduced: boolean): PearlLook {
  const base = liftLook(age, slot, reduced);
  const warn = !reduced && remaining !== undefined && remaining < EXPIRY_WARNING;
  const flicker = warn ? .7 + .3 * Math.sin(time * 38) : 1;
  const bob = reduced ? 0 : .1 * sweep(age, LIFT_SECONDS, .3) * Math.sin(time * 2.2 + slot.order * 6.28);
  return { ...base, lift: base.lift + bob, alpha: base.alpha * flicker, flameAlpha: base.flameAlpha * flicker };
}

/** The ground snapshot is gone: pearls come down to rest, then draw in to the centre while the flames fold. */
export function releaseLook(age: number, slot: Slot, reduced: boolean): PearlLook {
  if (reduced) { const alpha = fadeOut(age, 0, .2); return { lift: CAGE_LIFT[slot.ring], pull: 0, scale: 1, alpha, flameScale: 1, flameAlpha: alpha }; }
  const descend = motion.settle(sweep(age, 0, DESCEND_SECONDS));
  const pull = motion.launch(sweep(age, DESCEND_SECONDS, RELEASE_SECONDS - DESCEND_SECONDS));
  return {
    lift: lerp(CAGE_LIFT[slot.ring], REST_LIFT, descend), pull, scale: 1 - .55 * pull,
    alpha: fadeOut(age, RELEASE_SECONDS - .1, .1),
    flameScale: 1 - motion.settle(sweep(age, 0, RELEASE_SECONDS * .9)), flameAlpha: fadeOut(age, RELEASE_SECONDS * .6, RELEASE_SECONDS * .4),
  };
}

/** Looping flame frame; every lamp is phase-shifted so the 24 flames never pulse together. */
export function flameFrame(time: number, slot: Slot, reduced: boolean): number {
  return reduced ? 3 : Math.floor(time / FLAME_FRAME_SECONDS + slot.order * FLAME_FRAMES * 2.3) % FLAME_FRAMES;
}

/** Array decal: snaps in with the resolve, holds, and goes with the release. */
export function arrayAlpha(activeAge: number, releaseAge: number | undefined): number {
  const forming = Math.min(1, activeAge / .2);
  return releaseAge === undefined ? forming * .92 : fadeOut(releaseAge, 0, RELEASE_SECONDS) * .92;
}

/** Shield hand-off: a small pearl leaves the cage and arcs to the recipient's chest. */
export const GIFT_FLIGHT = .3, GIFT_ARC = 1.4, GIFT_SIZE = .85, GIFT_END_LIFT = 2.3;
export function giftPose(age: number): { t: number; arc: number; alpha: number; scale: number } {
  const t = motion.easeOut(sweep(age, 0, GIFT_FLIGHT));
  return { t, arc: GIFT_ARC * 4 * t * (1 - t), alpha: fadeOut(age, GIFT_FLIGHT, .08), scale: 1 - .25 * t };
}

/** Reflect burst: the cracked pearl with flame wings; its widest frame (.9437 of the cell) spans the R2.5 radius. */
export const REFLECT_FRAMES = 8, REFLECT_FRAME_SECONDS = .055, REFLECT_LIFT = 1.1;
export const BURST_SIZE = REFLECT_RADIUS * 2 / .9437;
export const REFLECT_LIFE = REFLECT_FRAMES * REFLECT_FRAME_SECONDS;
export function reflectFrame(age: number, reduced: boolean): number {
  return reduced ? 3 : Math.min(REFLECT_FRAMES - 1, Math.floor(Math.max(0, age) / REFLECT_FRAME_SECONDS));
}
export function reflectAlpha(age: number, reduced: boolean): number {
  return Math.min(1, age / .03) * fadeOut(age, reduced ? .15 : REFLECT_LIFE - .1, reduced ? .15 : .1);
}

/** Reflected fire line (4.0895:1, pearl head on +X) from the nearest cage pearl to the attacker. */
export const RIBBON_ASPECT = 4.0895, RIBBON_LENGTH = 4.2, RIBBON_WIDTH = RIBBON_LENGTH / RIBBON_ASPECT;
export const RIBBON_FLIGHT = .2, RIBBON_FADE = .12;
export function ribbonPose(age: number): { t: number; alpha: number } {
  return { t: motion.launch(sweep(age, 0, RIBBON_FLIGHT)), alpha: Math.min(1, age / .03) * fadeOut(age, RIBBON_FLIGHT, RIBBON_FADE) };
}
export const RIBBON_LIFE = RIBBON_FLIGHT + RIBBON_FADE;

/** Basic attack: one lamp flame blooms at the struck monster's feet. */
export const BASIC_FRAME_SECONDS = .06, BASIC_LIFE = FLAME_FRAMES * BASIC_FRAME_SECONDS, BASIC_SIZE = 1.6;
export function basicPose(age: number): { frame: number; alpha: number; scale: number } {
  return { frame: Math.min(FLAME_FRAMES - 1, Math.floor(age / BASIC_FRAME_SECONDS)), alpha: fadeOut(age, BASIC_LIFE - .12, .12),
    scale: motion.impactOvershoot(sweep(age, 0, .14)) };
}
