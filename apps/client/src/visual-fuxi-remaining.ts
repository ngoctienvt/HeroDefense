import { FUXI } from '../../../content/fuxi-design.js';

/** Snapshot time controls closure; receiving a new snapshot never restarts awakening. */
export function baguaPhase(radius: number, remaining: number): { size: number; closing: boolean } | undefined {
  if (!Number.isFinite(radius) || radius <= 0 || !Number.isFinite(remaining) || remaining <= 0) return;
  return { size: radius * 2, closing: remaining <= .4 };
}

/** A normal-attack link must not be relabelled as an ultimate link. */
export function isBaguaLink(remaining: number, sharePercent: number): boolean {
  return Number.isFinite(remaining) && remaining > 0 && sharePercent === FUXI.skillLinkShare;
}
