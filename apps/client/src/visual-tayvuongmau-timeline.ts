import { TAYVUONGMAU as T } from '../../../content/tayvuongmau-design.js';
import { arcHeight, fadeOut, motion, sweep } from './visual-kit-timeline.js';

/**
 * Pure timing/layout for Tây Vương Mẫu (h01A): Côn Lôn Vạn Kim Vũ (rain of golden hairpins over R7) and Bàn Đào Yến
 * (up to three peaches). No Babylon imports: testable. Art measured by assets/vfx-source/tayvuongmau/process-art.py
 * (active-inventory.json). Everything here is presentation; the server already resolved damage at the events.
 */

export interface Point2 { x: number; z: number }
export interface Point3 { x: number; y: number; z: number }

/** Server windup for skill-h01A when the cast event omits it (combat.ts WINDUP_SECONDS). */
export const DEFAULT_WINDUP = .25;
/** A cast whose resolve never arrives (cancelled, caster died) is cleaned up this long after its windup. */
export const CAST_GRACE = .3;

/** Hairpin art: 2.76:1, needle tip at texture +X (the art is mirrored in process-art.py), painted to .9893 of the width. */
export const PIN_ASPECT = 2.7601;
/** Apparent on-screen length of a hairpin; the plane is lengthened by the foreshortening of its flight line. */
export const PIN_LENGTH = 3;
export const PIN_WIDTH = PIN_LENGTH / PIN_ASPECT;
/** The basic shot is a smaller pin. */
export const BASIC_PIN_LENGTH = 2.3;
export const BASIC_PIN_WIDTH = BASIC_PIN_LENGTH / PIN_ASPECT;

/** Pins in one rain, and how many of them are aimed at monsters the server listed (the rest scatter over the area). */
export const PIN_COUNT = 11;
export const MAX_TARGET_PINS = 6;
/** Landing spread keeps the whole impact sprite inside the R7 gameplay edge. */
export const LANDING_RADIUS = T.rainRadius - .9;
export const MIN_LANDING_GAP = 1.5;

/** The pins gather in a tight crown this high over the locked point (tip height) and this wide. */
export const HOVER_TIP_HEIGHT = 6, HOVER_RISE = .9, HOVER_SPREAD = 2.1;
export const POP_STAGGER = .012, POP_SECONDS = .12;
export const DROP_STAGGER = .012, DROP_FLIGHT = .3;
/** The last pin lands here, measured from the resolve. */
export const LAST_LAND = (PIN_COUNT - 1) * DROP_STAGGER + DROP_FLIGHT;

/** Impact sheet: 6 frames (tip aligned on a 480 canvas, tip at .7917 from the top); planted pin pulls up and fades at the end. */
export const IMPACT_FRAMES = 6, IMPACT_FRAME_SECONDS = .085;
export const IMPACT_TIP_FROM_TOP = .7917;
/** Billboard size so the planted pin (≈ .7 of the canvas) is as long as a falling one. */
export const IMPACT_SIZE = PIN_LENGTH / .7;
export const IMPACT_FADE = .2, IMPACT_LIFT = .9, IMPACT_LIFT_SECONDS = .25;
export const IMPACT_LIFE = IMPACT_FRAMES * IMPACT_FRAME_SECONDS + .13;
export const REDUCED_IMPACT_LIFE = .5;

/** Basic shot: nock beside the caster, strike at the monster; the pin stays stuck a moment then fades. */
export const BASIC_FLIGHT = .2, BASIC_STUCK = .16, BASIC_FADE = .12;
export const NOCK_HEIGHT = 1.9, STRIKE_HEIGHT = .8, MAX_BASIC_PINS = 5;

/** Peach: cloud-tailed fruit arcs from the caster to the recipient, then folds into them. */
export const PEACH_ASPECT = 4;
export const PEACH_LENGTH = 3.2, PEACH_WIDTH = PEACH_LENGTH / PEACH_ASPECT;
export const PEACH_FLIGHT = .5, PEACH_ABSORB = .25, PEACH_LIFE = PEACH_FLIGHT + PEACH_ABSORB;
export const PEACH_START_HEIGHT = 2.5, PEACH_END_HEIGHT = 1.6, PEACH_ARC = 1.5;
/** The caster eating her own peach: it arrives from this far to the side. */
export const SELF_PEACH_OFFSET = 3;
/** Blessing mark on a recipient (empower `peach`, 5 s): feet ring radius and exit time. */
export const BLESSING_RADIUS = 1.35, BLESSING_FADE = .25;

const GOLDEN_ANGLE = 2.399963;

/** Fibonacci-disc point `k` of `of`, radius `radius`. */
function disc(k: number, of: number, radius: number): Point2 {
  const angle = k * GOLDEN_ANGLE, r = radius * Math.sqrt((k + .5) / of);
  return { x: Math.cos(angle) * r, z: Math.sin(angle) * r };
}

/**
 * Where the pins land: first on the monsters the server listed (clamped inside the area, at most MAX_TARGET_PINS,
 * never two on top of each other), then scattered evenly over the R7 area until there are `count`.
 */
export function landingPoints(center: Point2, targets: readonly Point2[], count = PIN_COUNT): Point2[] {
  const out: Point2[] = [];
  const far = (p: Point2) => out.every(o => Math.hypot(o.x - p.x, o.z - p.z) >= MIN_LANDING_GAP);
  for (const target of targets) {
    if (out.length >= Math.min(MAX_TARGET_PINS, count)) break;
    const dx = target.x - center.x, dz = target.z - center.z, distance = Math.hypot(dx, dz);
    const k = distance > LANDING_RADIUS ? LANDING_RADIUS / distance : 1;
    const point = { x: center.x + dx * k, z: center.z + dz * k };
    if (far(point)) out.push(point);
  }
  // 17 is coprime with 44 (= 4 × PIN_COUNT): the candidates are visited in a spread-out order, so the scatter covers
  // the whole area instead of filling the middle first.
  const total = count * 4;
  for (let j = 0; out.length < count && j < total; j++) {
    const offset = disc((j * 17) % total, total, LANDING_RADIUS);
    const point = { x: center.x + offset.x, z: center.z + offset.z };
    if (far(point)) out.push(point);
  }
  return out;
}

/** Crown position of pin `i` (tip) relative to the locked point: x/z offset and tip height. */
export function hoverOffset(i: number, count = PIN_COUNT): Point3 {
  const flat = disc(i, count, HOVER_SPREAD);
  return { x: flat.x, y: HOVER_TIP_HEIGHT + HOVER_RISE * ((i * 3) % count) / count, z: flat.z };
}

/** Unit direction the pin points in while hovering: down, leaning slightly outward so the crown reads as a fan. */
export function hoverDirection(i: number, count = PIN_COUNT): Point3 {
  const flat = hoverOffset(i, count), lean = .14;
  const length = Math.hypot(flat.x * lean, 1, flat.z * lean);
  return { x: flat.x * lean / length, y: -1 / length, z: flat.z * lean / length };
}

/** Pop-in (overshoot) one after another from the middle outward; reduced motion is a still crown. */
export function hoverPose(i: number, age: number, time: number, reduced: boolean): { scale: number; alpha: number; bob: number } {
  if (reduced) return { scale: 1, alpha: 1, bob: 0 };
  const grow = sweep(age, i * POP_STAGGER, POP_SECONDS);
  return { scale: motion.impactOvershoot(grow), alpha: Math.min(1, grow * 3), bob: .1 * Math.sin(time * 4 + i * 1.3) };
}

/** Launch order: a permutation of 0..PIN_COUNT-1 (5 and 11 are coprime), so the rain is not a sweep. */
export function dropOrder(i: number): number { return (i * 5) % PIN_COUNT; }
export function dropDelay(i: number): number { return dropOrder(i) * DROP_STAGGER; }
/** Accelerating fall of pin `i`, `age` seconds after the resolve: 0 before its launch, 1 on landing. */
export function dropProgress(i: number, age: number): number {
  return Math.pow(sweep(age, dropDelay(i), DROP_FLIGHT), 2.1);
}
export function landTime(i: number): number { return dropDelay(i) + DROP_FLIGHT; }

/** Apparent-length factor of a strip flying along `direction` seen along `look` (both unit-ish): 1 across the view, 0 along it. */
export function foreshorten(direction: Point3, look: Point3): number {
  const length = Math.hypot(direction.x, direction.y, direction.z) || 1;
  const dot = (direction.x * look.x + direction.y * look.y + direction.z * look.z) / length;
  return Math.max(.45, Math.sqrt(Math.max(0, 1 - dot * dot)));
}

export function impactFrame(age: number, reduced: boolean): number {
  return reduced ? 3 : Math.min(IMPACT_FRAMES - 1, Math.floor(Math.max(0, age) / IMPACT_FRAME_SECONDS));
}
/** Planted pin: snaps in, shows the sheet, then pulls up out of the ground while fading. */
export function impactPose(age: number, reduced: boolean): { alpha: number; lift: number } {
  const life = reduced ? REDUCED_IMPACT_LIFE : IMPACT_LIFE;
  const alpha = Math.min(1, age / .03) * fadeOut(age, life - IMPACT_FADE, IMPACT_FADE);
  return { alpha, lift: reduced ? 0 : IMPACT_LIFT * motion.settle(sweep(age, life - IMPACT_LIFT_SECONDS, IMPACT_LIFT_SECONDS)) };
}
export function impactLife(reduced: boolean): number { return reduced ? REDUCED_IMPACT_LIFE : IMPACT_LIFE; }

/** Basic pin: accelerating flight, then stuck, then fades. `t` is the head's share of the line. */
export function basicPose(age: number): { t: number; alpha: number } {
  return { t: motion.launch(sweep(age, 0, BASIC_FLIGHT)), alpha: fadeOut(age, BASIC_FLIGHT + BASIC_STUCK, BASIC_FADE) };
}
export const BASIC_LIFE = BASIC_FLIGHT + BASIC_STUCK + BASIC_FADE;

/** Peach head position `t` (0..1) along its arc from `from` to `to` (heights are absolute). */
export function peachHead(from: Point2, to: Point2, t: number): Point3 {
  const k = motion.easeOut(t);
  return { x: from.x + (to.x - from.x) * k, z: from.z + (to.z - from.z) * k,
    y: PEACH_START_HEIGHT + (PEACH_END_HEIGHT - PEACH_START_HEIGHT) * k + arcHeight(t, PEACH_ARC) };
}
/** Flight, then the cloud tail and fruit fold into the recipient (shorter and fainter) for PEACH_ABSORB. */
export function peachPose(age: number): { t: number; length: number; alpha: number } {
  const absorb = sweep(age, PEACH_FLIGHT, PEACH_ABSORB);
  return { t: sweep(age, 0, PEACH_FLIGHT), length: 1 - .85 * motion.settle(absorb), alpha: fadeOut(age, PEACH_FLIGHT, PEACH_ABSORB) };
}

/** Blessing ring alpha: fades in, breathes slowly; `out` is the seconds since the marker was last seen. */
export function blessingAlpha(age: number, out: number, time: number, reduced: boolean): number {
  const breathe = reduced ? .7 : .62 + .13 * Math.sin(time * 2.4);
  return Math.min(1, age / .2) * fadeOut(out, 0, BLESSING_FADE) * breathe;
}

/** Everything is gone this long after the resolve: the last pin lands, then its impact plays out. */
export function rainLife(reduced: boolean): number { return (reduced ? 0 : LAST_LAND) + impactLife(reduced); }
