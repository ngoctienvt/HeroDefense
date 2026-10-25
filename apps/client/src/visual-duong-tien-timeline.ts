import { fadeOut, motion, sweep } from './visual-kit-timeline.js';
export const DUONG_TIEN = { id: 'h00U', skill: 'tier3-tier4-h00U', length: 12, width: 3, formLife: 6 } as const;
export const DTN_CAPS = { charge: 6, strikes: 8, targets: 24, forms: 24, planes: 96, previews: 6 } as const;
export const BEAM_REVEAL = .18, BEAM_LIFE = .52, SCORCH_LIFE = 1.3, FORM_CLOSE = .34;
export type Point = { x: number; z: number };
const valid = (p?: Point): p is Point => Boolean(p && Number.isFinite(p.x) && Number.isFinite(p.z));
export function heavenDirection(raw: Point | undefined, origin: Point | undefined, aim: Point): Point | undefined {
  if (valid(raw) && Math.hypot(raw.x, raw.z) > .001) { const n = Math.hypot(raw.x, raw.z); return { x: raw.x / n, z: raw.z / n }; }
  if (!valid(origin) || !valid(aim)) return;
  const x = aim.x - origin.x, z = aim.z - origin.z, n = Math.hypot(x, z); return n > .001 ? { x: x / n, z: z / n } : undefined;
}
export function heavenCharge(age: number, windup: number, reduced: boolean) {
  const power = reduced ? 1 : motion.settle(sweep(age, 0, windup));
  return { frame: reduced ? 6 : Math.min(7, Math.floor(power * 8)), alpha: .3 + .6 * power, scale: .72 + .28 * power, head: .2 + .8 * power };
}
export function eyeBeamState(age: number, reduced: boolean) {
  return { reveal: reduced ? 1 : motion.launch(sweep(age, 0, BEAM_REVEAL)), alpha: fadeOut(age, .24, BEAM_LIFE - .24) };
}
export function beamContactDelay(origin: Point | undefined, dir: Point | undefined, target: Point, reduced: boolean): number {
  if (reduced || !origin || !dir) return 0;
  const along = Math.max(0, Math.min(DUONG_TIEN.length, (target.x - origin.x) * dir.x + (target.z - origin.z) * dir.z));
  return BEAM_REVEAL * Math.cbrt(along / DUONG_TIEN.length);
}
export function eyeScorchState(age: number, reduced: boolean) {
  const reveal = reduced ? 1 : motion.launch(sweep(age, 0, BEAM_REVEAL)), close = reduced ? 0 : motion.settle(sweep(age, .85, SCORCH_LIFE - .85));
  return { head: reveal, tail: .2 * close, width: 1 - close * .9, alpha: fadeOut(age, .8, SCORCH_LIFE - .8) };
}
export function warGodPose(remaining: number, age: number, closing: number | undefined, reduced: boolean, fresh: boolean) {
  const unfold = reduced || !fresh ? 1 : motion.settle(sweep(age, 0, .22));
  return { frame: reduced ? 3 : closing === undefined ? Math.floor(Math.max(0, DUONG_TIEN.formLife - remaining) / .12) % 12 : 12 + Math.min(3, Math.floor(closing / FORM_CLOSE * 4)),
    width: closing === undefined ? .55 + .45 * unfold : reduced ? 1 : 1 - motion.settle(sweep(closing, 0, FORM_CLOSE)) * .55,
    alpha: closing === undefined ? .3 + .6 * unfold : .9 * fadeOut(closing, 0, FORM_CLOSE) };
}
