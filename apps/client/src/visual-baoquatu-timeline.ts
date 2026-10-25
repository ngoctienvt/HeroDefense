/**
 * Pure timing for Bảo Quả Tử (h03P) "Thần Mộc Bá Vương Hoa" (no Babylon imports, so it is testable).
 * Art: assets/vfx-source/baoquatu (Codex-painted, see prompts/). Server truth (combat.ts, catalog.ts): `cast`
 * (windup 0.25 s) at the target enemy; `ability skill-h03P` = seed blast of 210% ATK in radius 4.0 around that
 * enemy; a `summon_plant` unit (Hoa Ăn Thịt) is spawned there for 6 s and sunders enemies within 3.0.
 * Beats: telegraph (cast) → seed arcs from the caster → burst flipbook `baoquatu-burst` at the target →
 * plant flipbook `baoquatu-plant` (grow 0-3, chomp loop 4-11, wither 12-15) + spore mist decal while the
 * snapshot still holds the plant.
 */
import { HEROES } from '../../../content/catalog.js';
import { arcHeight, motion, piecewise, segmentFrame, sweep } from './visual-kit-timeline.js';

export const BAOQUATU_ID = 'h03P';
export const BAOQUATU_SKILL = `skill-${BAOQUATU_ID}`;
export const BAOQUATU_ATLAS = { burst: 'baoquatu-burst', plant: 'baoquatu-plant' } as const;
export const SEED_URL = '/assets/vfx-baoquatu-seed.webp';
export const MIST_URL = '/assets/vfx-baoquatu-mist.webp';

const abilityEffect = HEROES.find(hero => hero.id === BAOQUATU_ID)?.ability?.effect as { radius?: number } | undefined;
/** catalog.ts `skill-h03P` effect radius (4.0): the seed-blast area. */
export const BLAST_RADIUS = abilityEffect?.radius ?? 4;
/** combat.ts: the plant sunders enemies within 3.0 of itself. */
export const MIST_RADIUS = 3;
/** combat.ts `summonDuration: 6.0`; only the debug replay uses it, live VFX follows the snapshot. */
export const PLANT_SECONDS = 6;
/** Server windup when a cast event carries none (combat.ts WINDUP_SECONDS). */
export const DEFAULT_WINDUP = .25;
/** A cast whose ability never comes (cancelled / left the zone) gives up after this long. */
export const ORPHAN_SECONDS = 1;

/** Seed in flight from the staff to the target: the server resolves the blast at once, so the arc is short. */
export const SEED_FLIGHT = .2;
export const SEED_PEAK = 1.9;
export function seedProgress(age: number): number { return motion.easeOut(sweep(age, 0, SEED_FLIGHT)); }
/** World height of the seed above the line caster→target at `age` (parabola on the shared arc helper). */
export function seedHeight(age: number, base = 1.4): number {
  return base + arcHeight(sweep(age, 0, SEED_FLIGHT), SEED_PEAK);
}
export function seedScale(age: number): number { return piecewise([[0, .55], [.04, 1], [SEED_FLIGHT, .85]], age); }

/** Telegraph at the target during the windup: spores are pulled upward in a ring that tightens. */
export function telegraphRadius(age: number, windup: number): number {
  return BLAST_RADIUS * (1 - .55 * sweep(age, 0, Math.max(.04, windup)));
}

/** Burst flipbook: 16 frames at 20 fps (crack, detonate, ring to the edge, clouds, fade). */
const BURST_FPS = 20;
export const BURST_SECONDS = 16 / BURST_FPS;
export function burstFrame(age: number): number { return segmentFrame(age, 0, 16, 1 / BURST_FPS); }
/** Seconds after landing when the ring of seed shrapnel leaves the ground (detonation, frame 3). */
export const BURST_THROW_DELAY = 2 / BURST_FPS;
/** Reduced motion: one still of the blast ring at its widest, held briefly. */
export const STILL_BURST_FRAME = 5;
export const STILL_SECONDS = .4;

/** Plant flipbook frames: grow 0-3, chomp loop 4-11, wither 12-15. */
export const PLANT_GROW_FRAMES = 4;
export const PLANT_LOOP_START = 4;
export const PLANT_LOOP_FRAMES = 8;
export const PLANT_WITHER_START = 12;
export const PLANT_WITHER_FRAMES = 4;
const GROW_FPS = 12;
const LOOP_FPS = 10;
const WITHER_FPS = 9;
export const PLANT_GROW_SECONDS = PLANT_GROW_FRAMES / GROW_FPS;
export const PLANT_WITHER_SECONDS = PLANT_WITHER_FRAMES / WITHER_FPS;
/** Marks arrive every frame while the plant is in the snapshot; a gap this long starts the wither. */
export const PLANT_MARK_GAP = .12;

/** `age` since the plant first appeared in the snapshot; the grow frames play once, then the chomp loops. */
export function plantFrame(age: number): number {
  if (age < PLANT_GROW_SECONDS) return segmentFrame(age, 0, PLANT_GROW_FRAMES, 1 / GROW_FPS);
  const loop = Math.floor((age - PLANT_GROW_SECONDS) * LOOP_FPS) % PLANT_LOOP_FRAMES;
  return PLANT_LOOP_START + loop;
}
export function plantWitherFrame(age: number): number {
  return segmentFrame(age, PLANT_WITHER_START, PLANT_WITHER_FRAMES, 1 / WITHER_FPS);
}
/** Reduced motion: the grown plant as one frame (mouth half open), no loop. */
export const STILL_PLANT_FRAME = 3;

/** Spore mist decal under the plant: grows in, drifts clockwise, thins out when the plant is gone. */
export const MIST_GROW = .45;
export const MIST_FADE = .5;
export const MIST_SPIN = .32; // rad/s
export function mistScale(age: number): number { return .45 + .55 * motion.impactOvershoot(sweep(age, 0, MIST_GROW)); }
/** The painted fog is dense; capped so enemies and the floor stay readable through it. */
export const MIST_MAX_ALPHA = .72;
export function mistAlpha(age: number, sinceGone: number): number {
  return MIST_MAX_ALPHA * motion.settle(sweep(age, 0, MIST_GROW)) * (1 - sweep(sinceGone, 0, MIST_FADE));
}
/** Plane side for a mist disc of `radius`: the painted fog fills 92% of its square. */
export function mistPlaneSide(radius: number): number { return radius * 2 / .92; }

/** Poison spores rise from the mist at most once per this many seconds. */
export const SPORE_GATE = .3;
