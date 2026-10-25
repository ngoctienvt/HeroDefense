import { motion, sweep, fadeOut } from './visual-kit-timeline.js';
export const MONKEY = { id: 'h00R', skill: 'tier3-tier4-h00R', cloneSkill: 'monkey-clone-h00R', length: 9, width: 3, cloneLife: 6, cloneReach: 3.2 } as const;
export const MONKEY_CAPS = { staffs: 6, painted: 80, clones: 16, casts: 6, strikes: 8, targets: 24 } as const;
export const CONTACT = .12, STAFF_LIFE = .62, CRACK_LIFE = 1.3;
export type Point = { x: number; z: number };
const valid = (p?: Point): p is Point => Boolean(p && Number.isFinite(p.x) && Number.isFinite(p.z));
export function monkeyDirection(raw: Point | undefined, origin: Point | undefined, aim: Point): Point | undefined {
  if (valid(raw) && Math.hypot(raw.x, raw.z) > .001) { const n = Math.hypot(raw.x, raw.z); return { x: raw.x / n, z: raw.z / n }; }
  if (!valid(origin) || !valid(aim)) return;
  const x = aim.x - origin.x, z = aim.z - origin.z, n = Math.hypot(x, z);
  return n > .001 ? { x: x / n, z: z / n } : undefined;
}
export function raisedStaff(age: number, windup: number, reduced: boolean) {
  return { angle: reduced ? 1.25 : .45 + .9 * motion.settle(sweep(age, 0, windup)), alpha: .95 };
}
export function slamStaff(age: number, reduced: boolean) {
  return { angle: reduced ? 0 : age < CONTACT ? 1.35 * (1 - motion.launch(sweep(age, 0, CONTACT))) : .045 * (1 - motion.settle(sweep(age, CONTACT, .18))),
    alpha: fadeOut(age, .3, STAFF_LIFE - .3) };
}
export function crackState(age: number, reduced: boolean) {
  return { reveal: reduced ? 1 : motion.settle(sweep(age, 0, .2)), width: reduced ? 1 : 1 - motion.settle(sweep(age, .88, CRACK_LIFE - .88)),
    alpha: fadeOut(age, .82, CRACK_LIFE - .82) };
}
export function artFrame(age: number, life: number, frames: number, reduced: boolean): number {
  return reduced ? Math.min(3, frames - 1) : Math.min(frames - 1, Math.floor(Math.max(0, age) / life * frames));
}
/** Snapshot birth gate: reconnect partway through a lifetime must not replay the birth. */
export function freshClone(remaining: number): boolean { return Number.isFinite(remaining) && remaining >= MONKEY.cloneLife - .2 && remaining <= MONKEY.cloneLife; }
export function inMonkeyLane(origin: Point, dir: Point, target: Point): boolean {
  const x = target.x - origin.x, z = target.z - origin.z;
  return x * dir.x + z * dir.z >= 0 && x * dir.x + z * dir.z <= MONKEY.length && Math.abs(x * dir.z - z * dir.x) <= MONKEY.width / 2;
}

/** First painted sweep: contact (70,417) to tip (404,147), measured in source pixels. */
export const SWEEP_PAINT_ANGLE = Math.atan2(270, 334);
