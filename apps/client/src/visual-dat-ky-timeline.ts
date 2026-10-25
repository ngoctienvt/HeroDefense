import { fadeOut, motion, sweep } from './visual-kit-timeline.js';
export const DAT_KY = { id: 'h00X', skill: 'tier3-tier4-h00X', records: 7 } as const;
export const DK_CAPS = { casts: 6, chains: 6, hits: 64, planes: 112, tails: 12 } as const;
export const FOX_EXIT = .34;
export function foxCharge(age: number, windup: number, reduced: boolean) {
  const power = reduced ? 1 : motion.settle(sweep(age, 0, windup));
  return { frame: reduced ? 6 : Math.min(7, Math.floor(power * 8)), width: .6 + .4 * power, alpha: .28 + .62 * power };
}
export function foxLegLife(distance: number): number { return .105 + Math.min(.105, Math.max(0, distance) * .014); }
export function foxFlight(age: number, life: number) {
  const t = motion.launch(sweep(age, 0, life)); return { t, zig: Math.sin(t * Math.PI * 3) * Math.sin(t * Math.PI) * .48, rise: Math.sin(t * Math.PI) * .3 };
}
export function foxExit(age: number, reduced: boolean) {
  const fold = reduced ? 0 : motion.settle(sweep(age, 0, FOX_EXIT)); return { width: 1 - fold * .75, scale: 1 - fold * .65, alpha: fadeOut(age, 0, FOX_EXIT) };
}
export function foxTailsExit(age: number, reduced: boolean) {
  return { frame: reduced ? 10 : Math.min(15, 8 + Math.floor(Math.max(0, age) / .45 * 8)), width: reduced ? 1 : 1 - motion.settle(sweep(age, .1, .35)) * .72, alpha: fadeOut(age, .1, .35) };
}
