import { NUWA as N } from '../../../content/nuwa-design.js';
import { fadeOut, motion, piecewise, segmentFrame } from './visual-kit-timeline.js';

const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));

/**
 * Pure beats of Nữ Oa Bổ Thiên (no Babylon imports, testable). Sheet layouts:
 * `mending-heaven-sheet` 4×4: 0–10 the sky rift opens and five-colour stones gather into a mending band, 11–15 it mends shut;
 * `five-color-stone-rain-sheet` 4×4: 0–3 stones fall, 4–7 land in dust, 8–11 shatter, 12–15 settle;
 * `five-color-stone-hit-sheet` 4×2: 0–7 one shatter with its own dust ring.
 * Beats: cast (0.25 s windup) rift opens over the caster → `ability` event: stones leave the rift, fall on every monster the
 * server listed (outermost last), land with dust + shards + a stone mark → rift mends shut. Nothing here decides a result.
 */

/** Cast: frames 0–10 across the windup, held on the last one if the event is late. */
export const RIFT_GATHER_LAST = 10;
export const RIFT_WIDTH = 8.6;
/** Rift art foot above the caster's feet along screen-up (hero plane is 8.2 tall: the rift stands behind and above). */
export const RIFT_LIFT = 2.4;
/** Server windup of the ultimate (combat.ts); used only when a resolve arrives with no cast event. */
export const DEFAULT_WINDUP = .25;
/** A lost resolve never leaves the rift hanging past windup + this. */
export const CAST_GRACE = .6;
/** Ground sigil under the caster: a presentation disc only — the stone rain has no gameplay radius. */
export const SIGIL_DIAMETER = 7.2;

export function riftFrame(age: number, windup: number, reduced: boolean): number {
  if (reduced) return 8;
  return Math.min(RIFT_GATHER_LAST, Math.floor(clamp01(age / Math.max(.05, windup)) * (RIFT_GATHER_LAST + 1)));
}
export const riftAlpha = (age: number, windup: number): number => .4 + .6 * clamp01(age / Math.max(.05, windup) * 2);
/** The rift rises a little as it opens, then hangs. */
export const riftRise = (age: number, windup: number, reduced: boolean): number =>
  reduced ? 0 : .9 * (1 - motion.settle(age / Math.max(.05, windup)));

/** Release: the stones spin free for RELEASE_HOLD, then frames 11–15 mend the sky shut. */
export const RELEASE_HOLD = .3;
export const MEND_START = 11;
export const MEND_FRAMES = 5;
export const MEND_FRAME_SECONDS = .07;
export const MEND_SECONDS = MEND_FRAMES * MEND_FRAME_SECONDS;
export const RELEASE_SECONDS = RELEASE_HOLD + MEND_SECONDS;
export const releaseSeconds = (reduced: boolean): number => reduced ? .4 : RELEASE_SECONDS;
export function releaseFrame(landedAge: number, reduced: boolean): number {
  if (reduced) return MEND_START + 1;
  if (landedAge < RELEASE_HOLD) return 7 + Math.floor(landedAge / .06) % 3;
  return segmentFrame(landedAge - RELEASE_HOLD, MEND_START, MEND_FRAMES, MEND_FRAME_SECONDS);
}
export const sigilAlpha = (age: number, windup: number, landedAge?: number): number =>
  (.25 + .6 * clamp01(age / Math.max(.05, windup))) * (landedAge === undefined ? 1 : fadeOut(landedAge, 0, .45));

/** One monster's rain: fall (frames 0–3, accelerating from the sky) → land (4–15). Farther monsters are hit a beat later. */
export const FALL_SECONDS = .2;
export const FALL_HEIGHT = 9;
export const FALL_FRAME_SECONDS = FALL_SECONDS / 4;
export const MAX_STAGGER = .14;
export const STAGGER_PER_UNIT = .012;
export const IMPACT_FIRST = 4;
export const IMPACT_FRAMES = 12;
export const IMPACT_FRAME_SECONDS = .045;
export const IMPACT_SECONDS = IMPACT_FRAMES * IMPACT_FRAME_SECONDS;
export const RAIN_LIFE = FALL_SECONDS + IMPACT_SECONDS;
export const RAIN_WIDTH = 3.9;
export const rainDelay = (distance: number, reduced: boolean): number =>
  reduced ? 0 : Math.min(MAX_STAGGER, Math.max(0, distance) * STAGGER_PER_UNIT);

/** `age` counts from the stone leaving the rift; `lift` is the height of the falling cluster above the monster's feet. */
export function rainState(age: number, reduced: boolean): { falling: boolean; frame: number; lift: number } {
  if (reduced) return { falling: false, frame: IMPACT_FIRST + 2, lift: 0 };
  if (age < FALL_SECONDS) {
    return { falling: true, frame: segmentFrame(age, 0, 4, FALL_FRAME_SECONDS), lift: FALL_HEIGHT * (1 - motion.launch(age / FALL_SECONDS)) };
  }
  return { falling: false, frame: segmentFrame(age - FALL_SECONDS, IMPACT_FIRST, IMPACT_FRAMES, IMPACT_FRAME_SECONDS), lift: 0 };
}
export const rainLife = (reduced: boolean): number => reduced ? .3 : RAIN_LIFE;
/** The cluster grows to full size as it comes down; the landing pops with a small overshoot. */
export const rainScale = (age: number, reduced: boolean): number => reduced ? 1
  : age < FALL_SECONDS ? .7 + .3 * motion.launch(age / FALL_SECONDS)
    : 1 + .1 * (1 - motion.settle((age - FALL_SECONDS) / .12));

/** The shatter sheet pops on the landing, slightly smaller and quicker than the rain pile behind it. */
export const HIT_FRAMES = 8;
export const HIT_FRAME_SECONDS = .04;
export const HIT_SECONDS = HIT_FRAMES * HIT_FRAME_SECONDS;
export const HIT_WIDTH = 3.3;
export const hitFrame = (age: number, reduced: boolean): number =>
  reduced ? 2 : segmentFrame(age, 0, HIT_FRAMES, HIT_FRAME_SECONDS);
export const hitSeconds = (reduced: boolean): number => reduced ? .22 : HIT_SECONDS;

/** Stone mark: the dust ring of the shatter (hit frame 6) lies flat where the stone fell and cools out. It is no danger zone. */
export const MARK_FRAME = 6;
export const MARK_DIAMETER = 3.4;
export const MARK_SECONDS = .6;
const MARK_KEYS = [[0, 0], [.06, .9], [.3, .7], [MARK_SECONDS, 0]] as const;
export const markAlpha = (age: number, reduced: boolean): number =>
  reduced ? fadeOut(age, .2, .3) * .8 : piecewise(MARK_KEYS, age);

/** Budgets: the rain is lane-wide, so a crowd renders the nearest monsters in full and logs the rest as capped. */
export const MAX_TARGETS = 30;
export const MAX_TARGETS_REDUCED = 14;
export const MAX_RIBBONS = 5;
export const targetBudget = (reduced: boolean): number => reduced ? MAX_TARGETS_REDUCED : MAX_TARGETS;

/** Nearest-first keeps the budget on the monsters closest to the fight; the stagger then ripples outward from the rift. */
export function nearestFirst<T extends { x: number; z: number }>(targets: readonly T[], from: { x: number; z: number }): T[] {
  return [...targets].sort((a, b) => Math.hypot(a.x - from.x, a.z - from.z) - Math.hypot(b.x - from.x, b.z - from.z));
}

/** Blessing (`blessing-h01C`, every deployed ally) and revive (`revive-h01C`, only those standing up). */
export const BLESS_RADIUS = 2.3;
export const BLESS_RING_LIFE = .7;
export const MAX_BLESS = 16;
export const MEND_ALLY_WIDTH = 3.8;
export const REVIVE_MEND_WIDTH = 5.4;
export const MAX_REVIVE = 6;
export const mendAllyFrame = (age: number, reduced: boolean): number =>
  reduced ? MEND_START + 1 : segmentFrame(age, MEND_START, MEND_FRAMES, MEND_FRAME_SECONDS);
export const mendAllySeconds = (reduced: boolean): number => reduced ? .3 : MEND_SECONDS;

/** Ward (`ward.kind === 'five-color'`, N.blessingSeconds): enter, hold, then the stones draw back over the last WARD_EXIT. */
export const WARD_EXIT = .35;
export const WARD_ENTER = .25;
export const WARD_DIAMETER = 3.6;
/** The snapshot loop marks less often than frames render: only a marker silent past the grace is really gone. */
export const WARD_GRACE = .25;
export const MAX_WARDS = 16;
export const wardAlpha = (remaining: number, sinceFirst: number): number =>
  clamp01(remaining / WARD_EXIT) * clamp01(sinceFirst / WARD_ENTER);
/** The ring breathes slowly; reduced motion holds it. */
export const wardPulse = (time: number, reduced: boolean): number => reduced ? 1 : .88 + .12 * Math.sin(time * 2.4);
export const WARD_SECONDS = N.blessingSeconds;
