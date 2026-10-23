import { tier3Ability } from './visual-tier3-content.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
export const TRIEU_CONG_MINH = { id: 'h03S', skill: tier3Ability('h03S').id, length: 8, width: 2 } as const;
export const FLIGHT = .68, HIT_LIFE = .52, RECEIPT_LIFE = .72, RETURN_LIFE = .32;
/** Entire square plane fits the 2-wide lane at every angle, including camera-facing billboard projection. */
export const COIN_SIZE = 1.35, COIN_RADIUS = COIN_SIZE * Math.SQRT2 / 2;
export type Point = { x: number; z: number };
export function coinDirection(event: Pick<GameEvent, 'direction'>, origin: Point | undefined, aim: Point): Point | undefined {
  const normalize = (p: Point) => {
    const length = Math.hypot(p.x, p.z);
    return Number.isFinite(length) && length > 1e-5 ? { x: p.x / length, z: p.z / length } : undefined;
  };
  return (event.direction && normalize(event.direction)) ?? (origin && normalize({ x: aim.x-origin.x, z: aim.z-origin.z }));
}
const clamp = (v: number) => Math.min(1, Math.max(0, v));
export function coinDistance(age: number): number {
  return COIN_RADIUS + (TRIEU_CONG_MINH.length - 2 * COIN_RADIUS) * clamp(age / FLIGHT) ** 2;
}
/** Inverse of the accelerated centre trajectory; behind/edge recipients are still actual hits. */
export function coinArrival(origin: Point | undefined, dir: Point | undefined, target: Point): number {
  if (!origin || !dir) return 0;
  const projection = (target.x-origin.x)*dir.x + (target.z-origin.z)*dir.z;
  return FLIGHT * Math.sqrt(clamp((projection - COIN_RADIUS) / (TRIEU_CONG_MINH.length - 2 * COIN_RADIUS)));
}
export function coinCharge(age: number, windup: number, reduced: boolean) {
  const progress = clamp(age / Math.max(.01, windup));
  return { frame: reduced ? 0 : Math.min(7, Math.floor(progress * 7)),
    size: reduced ? 1 : .55 + progress * .45, alpha: reduced ? .8 : .35 + progress * .6,
    time: reduced ? 0 : Math.min(age, windup) };
}
export function coinPhase(age: number, life: number, reduced: boolean, pose = 3) {
  return { frame: reduced ? pose : Math.min(7, Math.floor(clamp(age / life) * 8)),
    alpha: age < 0 || age >= life ? 0 : 1 - clamp((age-life*.72)/(life*.28)) };
}
/** Reveal the existing tail's head side without stretching or showing its whole image on frame one. */
export function coinTrail(age: number, travelled: number) {
  const fraction = clamp(age / .14), length = Math.min(3.1 * fraction, Math.max(0, travelled - COIN_RADIUS));
  return { length, fraction: length / 3.1, alpha: 1 - clamp((age-FLIGHT+.1)/.1) };
}
export function coinTrailUvs(base: readonly number[], fraction: number): number[] {
  const f = clamp(fraction);
  return base.map((v, i) => i % 2 === 0 ? 1-f+v*f : v);
}
