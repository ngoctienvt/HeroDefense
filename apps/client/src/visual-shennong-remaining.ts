import { SHENNONG } from '../../../content/shennong-design.js';

export function grovePhase(radius: number, remaining: number): { size: number; closing: boolean } | undefined {
  if (!Number.isFinite(radius) || radius <= 0 || !Number.isFinite(remaining) || remaining <= 0) return;
  return { size: radius * 2, closing: remaining <= .45 };
}

/** Tree emergence is tied to actual summon age, including reconnect during the hold. */
export function treeFrames(remaining: number): { startFrame: number; endFrame: number } | undefined {
  if (!Number.isFinite(remaining) || remaining <= 0) return;
  if (remaining <= .45) {
    const frame = Math.min(15, 12 + Math.floor((1 - remaining / .45) * 4));
    return { startFrame: frame, endFrame: frame };
  }
  if (remaining >= SHENNONG.zoneSeconds - .35) {
    const frame = Math.min(3, Math.floor(Math.max(0, SHENNONG.zoneSeconds - remaining) / .35 * 4));
    return { startFrame: frame, endFrame: frame };
  }
  return { startFrame: 7, endFrame: 7 };
}
