import { tier3Ability } from './visual-tier3-content.js';
import { motion, sweep, fadeOut } from './visual-kit-timeline.js';
export const PHAN_QUAN = { id: 'h00O', skill: tier3Ability('h00O').id,
  radius: tier3Ability('h00O').effect?.radius ?? 0, seconds: 4 } as const;
export const PQ_CAPS = { casts: 8, sweeps: 10, hits: 64, pairs: 32, shackles: 48, planes: 192 } as const;
export const INK_SWEEP = .38, INK_EXIT = .4, LINK_EXIT = .25;
export const LEDGER_SIZE = 5.8, LEDGER_LIFT = 5.2;
export function inkYaw(direction: { x: number; z: number }): number { return Math.atan2(-direction.z, direction.x) + Math.PI; }
export function ledgerCharge(age: number, windup: number) {
  const power = sweep(age, 0, windup); return { frame: Math.min(2, Math.floor(power * 3)),
    scale: .7 + .3 * motion.settle(power), alpha: .3 + .7 * power };
}
export function inkReveal(age: number, reduced: boolean): number { return reduced ? 1 : motion.settle(sweep(age, 0, INK_SWEEP)); }
export function inkTargetDelay(side: number, planeSize: number): number {
  const reveal = Math.max(0, Math.min(1, .5 - side / planeSize));
  return INK_SWEEP * (1 - Math.cbrt(1 - reveal));
}
export function bondExit(remaining: number, missing: number): number {
  return Math.max(sweep(.4 - remaining, 0, .4), sweep(missing, 0, LINK_EXIT));
}
export function bondAlpha(remaining: number, missing: number): number { return 1 - bondExit(remaining, missing); }
export function shackleFrame(age: number, remaining: number, missing: number, opening: boolean, reduced: boolean): number {
  if (reduced) return 6;
  const exit = bondExit(remaining, missing);
  if (exit > 0) return Math.min(15, 12 + Math.floor(exit * 4));
  if (opening && age < .18) return Math.min(3, Math.floor(age / .18 * 4));
  return 4 + Math.floor(age * 7) % 5;
}
export function inkAlpha(age: number): number { return fadeOut(age, INK_SWEEP, INK_EXIT); }
