import { THAIBACH as T } from '../../../content/thaibach-design.js';
import { arcHeight, fadeOut, sweep } from './visual-kit-timeline.js';

/**
 * Pure timing/layout for Thái Bạch Kim Tinh (h015): Tinh Quân Hồi Mệnh (heal one ally, or revive the strongest fallen
 * one) and Trường Canh Hộ Mệnh (cheat-death passive). No Babylon imports: testable. Art measured by
 * assets/vfx-source/thaibach/process-art.py (active-inventory.json). Everything here is presentation; the server
 * already healed/revived at the event and R12 is only the heal's selection range (no area is ever drawn).
 */

export interface Point3 { x: number; y: number; z: number }

/** Server windup of skill-h015 (design) and the grace after which a cast with no resolve folds away. */
export const DEFAULT_WINDUP = T.windup;
export const CAST_GRACE = .3;

/** Morningstar sheet: 4x4, 16 frames of 256 px; frames 0-7 gather/open, 8-9 the open star, 10-15 the dismissal. */
export const CAST_COLUMNS = 4, CAST_ROWS = 4;
export const GATHER_LAST_FRAME = 7, OPEN_FRAMES = [8, 9] as const, CLOSE_FIRST_FRAME = 10, CLOSE_LAST_FRAME = 15;
export const OPEN_FRAME_SECONDS = .1;
/** "Sao khép tia, mây cuộn đi": the dismissal frames play in this long. */
export const CLOSE_SECONDS = .25;
/** Billboard size; the cloud base (≈ .9 of the cell) hangs this far above her feet so the star clears her head. */
export const CAST_SIZE = 4.4, CAST_ANCHOR_Y = .9, CAST_LIFT = 2;
/** Height of the star's centre over her feet (cell centre .48 of the sheet): where the guidance leaves from. */
export const STAR_HEIGHT = CAST_LIFT + (CAST_ANCHOR_Y - .48) * CAST_SIZE;

export interface CastPose { frame: number; alpha: number; done: boolean }

/**
 * Cast sheet pose. Gathering follows the real windup (held on the open frame if the resolve is late); the resolve
 * (`resolvedAt`, a cast age) shows the open star, then the dismissal; no resolve at all folds away after the grace.
 */
export function castPose(age: number, windup: number, resolvedAt?: number): CastPose {
  const fadeIn = Math.min(1, age / .08);
  const closeFrom = resolvedAt !== undefined ? resolvedAt + OPEN_FRAMES.length * OPEN_FRAME_SECONDS : windup + CAST_GRACE;
  if (resolvedAt !== undefined && age >= resolvedAt && age < closeFrom) {
    return { frame: OPEN_FRAMES[Math.min(OPEN_FRAMES.length - 1, Math.floor((age - resolvedAt) / OPEN_FRAME_SECONDS))], alpha: 1, done: false };
  }
  if (age >= closeFrom) {
    const c = (age - closeFrom) / CLOSE_SECONDS;
    const count = CLOSE_LAST_FRAME - CLOSE_FIRST_FRAME + 1;
    return { frame: Math.min(CLOSE_LAST_FRAME, CLOSE_FIRST_FRAME + Math.floor(c * count)), alpha: 1, done: c >= 1 };
  }
  const t = Math.min(1, age / Math.max(1e-3, windup));
  return { frame: Math.min(GATHER_LAST_FRAME, Math.floor(t * (GATHER_LAST_FRAME + 1))), alpha: fadeIn, done: false };
}

/** Guidance ribbon art: 4.4912:1, head (star) at texture +X. Fixed aspect: never stretched to the distance. */
export const GUIDE_ASPECT = 4.4912;
export const GUIDE_FLIGHT = .18, GUIDE_FADE = .14;
export const GUIDE_LIFE = GUIDE_FLIGHT + GUIDE_FADE;
export const GUIDE_MIN_LENGTH = 2.6, GUIDE_MAX_LENGTH = 7;
/** Height of the recipient the ribbon lands on (chest) and the lift of its arc. */
export const UNIT_HEIGHT = 1.3, GUIDE_ARC = 1;
/** Within this distance of the caster the recipient is the caster herself (or beside her): no ribbon, only the fall. */
export const SELF_DISTANCE = .9;

export const guideLength = (distance: number): number => Math.max(GUIDE_MIN_LENGTH, Math.min(GUIDE_MAX_LENGTH, distance * .8));

/** Ribbon head along the arc from the star to the recipient; eased out so it arrives fast and soft. */
export function guideHead(from: Point3, to: Point3, age: number): Point3 {
  const t = sweep(age, 0, GUIDE_FLIGHT), e = 1 - (1 - t) * (1 - t);
  return { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e + arcHeight(e, GUIDE_ARC), z: from.z + (to.z - from.z) * e };
}

export const guideAlpha = (age: number): number => fadeOut(age, GUIDE_FLIGHT, GUIDE_FADE);

/** Starlight that drops onto the recipient (heal) / onto the spot where the ally stands up (revive). */
export interface FallSpec { delay: number; seconds: number; fromHeight: number; size: number }
export const HEAL_FALL: FallSpec = { delay: .06, seconds: .2, fromHeight: 5.2, size: 1 };
export const REVIVE_FALL: FallSpec = { delay: .04, seconds: .3, fromHeight: 6.8, size: 1.4 };
export const FALL_END_HEIGHT = .9;

export interface FallPose { height: number; alpha: number; scale: number; landed: boolean }

/** Accelerating drop (ease-in) with a short fade-out right at the landing. */
export function fallPose(age: number, spec: FallSpec): FallPose {
  const t = sweep(age, spec.delay, spec.seconds);
  const drop = t * t;
  const visible = age >= spec.delay;
  return { height: spec.fromHeight + (FALL_END_HEIGHT - spec.fromHeight) * drop,
    alpha: !visible ? 0 : t < 1 ? Math.min(1, (age - spec.delay) / .04 + .2) : fadeOut(age, spec.delay + spec.seconds, .08),
    scale: spec.size * (.8 + .2 * t), landed: t >= 1 };
}

export const fallLandingTime = (spec: FallSpec): number => spec.delay + spec.seconds;

/** Star footprint left on the ground at the landing: pops, holds, thins out. `age` counts from the landing. */
export const PRINT_SIZE = 2.4, PRINT_LIFE = .45;
export function printPose(age: number): { scale: number; alpha: number } {
  return { scale: PRINT_SIZE * (.7 + .3 * Math.min(1, age / .1)), alpha: age < 0 || age >= PRINT_LIFE ? 0 : fadeOut(age, .12, PRINT_LIFE - .12) };
}

/** Ring at the landing (kit ring, `changgeng` palette): a contact ring, never a heal/area disc. */
export const LANDING_RING_RADIUS = 1.4, LANDING_RING_LIFE = .4;

/**
 * Aftermath on a recipient (small star motif, the shared haste/invulnerable marks still draw): recorded from our own
 * events because other heroes grant haste and divineImmortal too. Capped by the design durations.
 */
export type StatusKind = 'haste' | 'immortal';
export const STATUS_SECONDS: Readonly<Record<StatusKind, number>> = { haste: T.hasteSeconds, immortal: T.reviveInvulnerable };
export const STATUS_FADE = .25;

/** True while a recorded status is still inside its design window (`recordedAt` and `now` on the module clock). */
export const statusActive = (kind: StatusKind, recordedAt: number | undefined, now: number): boolean =>
  recordedAt !== undefined && now - recordedAt <= STATUS_SECONDS[kind];

/** Ring alpha: rises in .12 s, breathes, and eases out over STATUS_FADE once the marker stops; reduced motion holds steady. */
export function statusAlpha(age: number, out: number, time: number, reduced: boolean): number {
  const base = reduced ? .7 : .6 + .15 * Math.sin(time * 4);
  return base * Math.min(1, age / .12) * fadeOut(out, 0, STATUS_FADE);
}
