/**
 * Pure timing for Mạnh Bà (h00I) "Vong Xuyên Hồn Liên" (no Babylon imports, so it is testable).
 * Art: assets/vfx-source/manhba (Codex-painted, see prompts/). Server (combat.ts, `chain`): `cast` windup at Mạnh Bà,
 * then `ability skill-h00I` with `targets` = up to 4 enemies in CHAIN ORDER (first target, then nearest unlinked within
 * 6 of the previous one); each gets `soulLink { remaining 4, group, sharePercent .3 }` and a 50% slow for 4 s.
 *
 * Beats: `manhba-pour` frames 0-3 wisps and bubbles rise during the windup, 4-7 the pot pours the Vong Xuyên soup;
 * `manhba-fan` strands burst toward the first target; then one painted soul rope per hop (her hand → target 1 → 2 → 3
 * → 4), each growing head first with the knot leading; `manhba-node` ring pulses on a monster when its rope head
 * arrives; the Đồng Mệnh bond is a turning water ring under every linked monster plus the ropes held between them.
 */
import { motion, segmentFrame, sweep } from './visual-kit-timeline.js';

export const MANHBA_ID = 'h00I';
export const MANHBA_SKILL = `skill-${MANHBA_ID}`;
export const MANHBA_ATLAS = { pour: 'manhba-pour', fan: 'manhba-fan', node: 'manhba-node' } as const;
export const LINK_STRIP_URL = '/assets/vfx-manhba-link-strip.webp';
export const BOND_RING_URL = '/assets/vfx-manhba-bond-ring.webp';

/** catalog `effect.jumps`: the rope links at most this many monsters. */
export const MAX_LINKS = 4;
/** catalog `statusSeconds` / combat.ts `soulLink.remaining`: Đồng Mệnh lasts this long. */
export const BOND_SECONDS = 4;
/** combat.ts `soulLink.sharePercent`: the share of damage passed to the other linked monsters. */
export const BOND_SHARE = .3;
/** Server windup when a cast event carries none (combat.ts WINDUP_SECONDS). */
export const DEFAULT_WINDUP = .25;

/** Pour: frames 0-3 form during the windup (held on 3), then 4-7 at 12 fps and a short hold. */
const POUR_FPS = 12;
export const POUR_AFTER_SECONDS = 4 / POUR_FPS + .25;
export const POUR_ORPHAN_SECONDS = 1.2;
export function pourFormingFrame(age: number, windup: number): number {
  return segmentFrame(age, 0, 4, Math.max(.04, windup) / 4);
}
export function pourFrame(age: number): number { return segmentFrame(age, 4, 4, 1 / POUR_FPS); }

/** Strand fan toward the first target: starts as the pour peaks, 8 frames at 16 fps. */
export const FAN_DELAY = .1;
const FAN_FPS = 16;
export const FAN_SECONDS = 8 / FAN_FPS;
export function fanFrame(age: number): number { return segmentFrame(age, 0, 8, 1 / FAN_FPS); }

/**
 * Soul ropes, head (knot) first. Hop `i` leaves the previous monster (hop 0: her hand) STAGGER seconds after hop
 * `i - 1`, so the chain visibly runs in server order. The strip then stays as the bond between the two monsters.
 */
export const LINK_START = .12;
export const LINK_STAGGER = .12;
export const LINK_EXTEND = .22;
export const HAND_LINK_SECONDS = .6;
export function linkDelay(hop: number): number { return LINK_START + hop * LINK_STAGGER; }
/** Seconds after the ability when hop `hop`'s head reaches its monster (node pulse and ring start). */
export function linkArrival(hop: number): number { return linkDelay(hop) + LINK_EXTEND * .9; }
export function linkReach(age: number): number { return motion.easeOut(sweep(age, 0, LINK_EXTEND)); }
/** Plane width keeps the painted 3:1 aspect, clamped so short hops stay thick and long hops do not balloon. */
export function linkPlaneWidth(length: number): number { return Math.min(1.5, Math.max(.9, length / 3)); }
/** Held rope: full while growing, a calm .7 with a slow pulse while the bond lasts, withers when the bond stops. */
export function linkAlpha(age: number, sinceBondEnd: number, time: number, reduced: boolean): number {
  const grow = motion.settle(sweep(age, 0, LINK_EXTEND * .6));
  const pulse = reduced ? 0 : .06 * Math.sin(time * 5);
  return Math.max(0, (.74 + pulse) * grow * (1 - sweep(sinceBondEnd, 0, BOND_FADE)));
}
export function linkWidth(age: number): number { return 1 - .35 * sweep(age, LINK_EXTEND, .4); }
/** The hand → first monster rope is only the launch: it fades out after this long instead of holding. */
export function handLinkAlpha(age: number): number {
  return motion.settle(sweep(age, 0, LINK_EXTEND * .6)) * (1 - sweep(age, HAND_LINK_SECONDS - .25, .25));
}

/** Node pulse (`manhba-node`, 8 frames at 14 fps) when a rope head lands. */
const NODE_FPS = 14;
export const NODE_SECONDS = 8 / NODE_FPS;
export function nodeFrame(age: number): number { return segmentFrame(age, 0, 8, 1 / NODE_FPS); }

/** Đồng Mệnh ring under a linked monster: grows in, turns counter-clockwise, withers when the snapshot drops it. */
export const BOND_RADIUS = 1.5;
export const BOND_GROW = .3;
export const BOND_FADE = .35;
export const BOND_SPIN = 1.6; // rad/s
export function bondScale(sinceStart: number): number { return .5 + .5 * motion.impactOvershoot(sweep(sinceStart, 0, BOND_GROW)); }
export function bondAlpha(sinceStart: number, sinceEnd: number): number {
  return .9 * motion.settle(sweep(sinceStart, 0, BOND_GROW)) * (1 - sweep(sinceEnd, 0, BOND_FADE));
}
/** A monster whose marks stop (died, left the zone, snapshot dropped the link) counts as unlinked after this long. */
export const MARK_LOST_SECONDS = .25;
/** Bubble/wisp flecks rise from a bonded monster at most once per this many seconds. */
export const BUBBLE_GATE = .55;
