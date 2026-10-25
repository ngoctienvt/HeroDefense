/**
 * Pure timing for Mộc Tra (h00A) "Ngô Câu Mộc Ảnh Vũ" (no Babylon imports, so it is testable).
 * Art: assets/vfx-source/moctra (Codex-painted, see prompts/). Awaken flipbook `moctra-awaken`: frames 0-3
 * sprout during the server windup, 4-15 coil, cross-slash and lash out after the ability. Vine lash =
 * painted strip `vine-lash` growing hook-first from Mộc Tra to the enemy; impact flipbook `moctra-hit`.
 */
import { HERO_COMBAT_PROFILES } from '../../../packages/contracts/src/combat-profiles.js';
import { motion, piecewise, segmentFrame, sweep } from './visual-kit-timeline.js';

export const MOCTRA_ID = 'h00A';
export const MOCTRA_SKILL = `skill-${MOCTRA_ID}`;
/** attack-geometry.ts: each main swing in Cuồng Vũ shoots up to 2 of these at other enemies within 4.5. */
export const VINE_SKILL = `vine-beam-${MOCTRA_ID}`;
export const MOCTRA_ATLAS = { awaken: 'moctra-awaken', hit: 'moctra-hit' } as const;
export const VINE_LASH_URL = '/assets/vfx-moctra-vine-lash.webp';
export const WREATH_URL = '/assets/vfx-moctra-wreath.webp';

/** Vine sword-qi reach (attack-geometry.ts `distance(e, unit) <= 4.5`, catalog "dài 4.5"). */
export const VINE_REACH = 4.5;
/** combat.ts: berserk { remaining: 5.0 } — only the debug replay uses it; live VFX follows the snapshot. */
export const FRENZY_SECONDS = 5;
/** Server windup when a cast event carries none (combat.ts WINDUP_SECONDS). */
export const DEFAULT_WINDUP = .25;

const geometry = HERO_COMBAT_PROFILES[MOCTRA_ID]?.geometry as unknown as { radius?: number } | undefined;
/** Frenzy wreath under Mộc Tra: inside his 2.2 frontal cleave so it never reads as an area attack. */
export const WREATH_RADIUS = (geometry?.radius ?? 2.2) * .7;

/** Awaken flipbook frame while sprouting during the windup (0-3), held on 3 until the ability arrives. */
export function awakenFormingFrame(age: number, windup: number): number {
  return segmentFrame(age, 0, 4, Math.max(.04, windup) / 4);
}
/** After the ability: frames 4-15 at 20 fps (coil, X cross-slash at 6-8, lash out, retract). */
const AWAKEN_FPS = 20;
export const AWAKEN_AFTER_SECONDS = 12 / AWAKEN_FPS;
export function awakenImpactFrame(age: number): number { return segmentFrame(age, 4, 12, 1 / AWAKEN_FPS); }
/** Seconds after the ability when the outward lash (frame 9) throws the leaf burst. */
export const LASH_OUT_DELAY = 5 / AWAKEN_FPS;
/** A cast whose ability never comes (cancelled / left the zone) gives up after this long. */
export const ORPHAN_SECONDS = 1.2;

/** Frenzy wreath: grows in with the awakening, whirls while Cuồng Vũ lasts, withers when the marks stop. */
export const WREATH_GROW = .35;
export const WREATH_FADE = .35;
export const WREATH_SPIN = 1.7; // rad/s, clockwise like the woven blades
export function wreathScale(sinceStart: number): number { return .55 + .45 * motion.impactOvershoot(sweep(sinceStart, 0, WREATH_GROW)); }
/** `sinceLastMark` 0 while the snapshot still holds berserk; fades over WREATH_FADE afterwards. */
export function wreathAlpha(sinceStart: number, sinceLastMark: number): number {
  return motion.settle(sweep(sinceStart, 0, WREATH_GROW)) * (1 - sweep(sinceLastMark, 0, WREATH_FADE));
}
/** Every vine shot kicks the wreath (scale) so the whirl reads as the source of the lashes. */
export function wreathKick(sinceShot: number): number { return piecewise([[0, 1], [.05, 1.1], [.18, 1]], sinceShot); }

/**
 * Vine lash, hook first: the strip grows from Mộc Tra to the enemy in LASH_EXTEND (the texture window
 * slides so the hook blade always leads), holds, then thins and fades.
 */
export const LASH_EXTEND = .11;
export const LASH_LIFE = .34;
export function lashReach(age: number): number { return motion.easeOut(sweep(age, 0, LASH_EXTEND)); }
export function lashAlpha(age: number): number { return 1 - sweep(age, LASH_EXTEND + .07, LASH_LIFE - LASH_EXTEND - .07); }
export function lashWidth(age: number): number { return 1 - .35 * sweep(age, LASH_EXTEND + .05, LASH_LIFE - LASH_EXTEND - .05); }
/** The hook strikes when the strip is fully out: the impact flipbook starts then. */
export const HIT_DELAY = LASH_EXTEND * .85;
const HIT_FPS = 22;
export const HIT_SECONDS = 8 / HIT_FPS;
export function hitFrame(age: number): number { return segmentFrame(age, 0, 8, 1 / HIT_FPS); }

/** Plane width for a lash of `length`: keeps the painted strip's 3:1 aspect, clamped so short shots stay thick. */
export function lashPlaneWidth(length: number): number { return Math.min(1.5, Math.max(1, length / 3)); }

/** Poison spores rise from a poisoned enemy at most once per this many seconds. */
export const SPORE_GATE = .45;
