import { fadeOut, motion, sweep } from './visual-kit-timeline.js';
export const NA_TRA = { id: 'h00V', skill: 'tier3-tier4-h00V', records: 8, candidateRadius: 6, formLife: 5.5 } as const;
export const NT_CAPS = { casts: 6, chains: 6, hits: 72, forms: 24, planes: 96, previews: 6 } as const;
export const NT_FORM_CLOSE = .34;
export function ringCharge(age: number, windup: number, reduced: boolean) {
  const power = reduced ? 1 : motion.settle(sweep(age, 0, windup));
  return { frame: reduced ? 0 : Math.floor(Math.max(0, Math.min(age, windup)) / .06) % 8, scale: .68 + .32 * power, alpha: .3 + .6 * power };
}
export function ringLegLife(distance: number): number { return .085 + Math.min(.095, Math.max(0, distance) * .012); }
export function ringLegProgress(age: number, life: number): number { return motion.launch(sweep(age, 0, life)); }
export function nezhaFormPose(remaining: number, age: number, closing: number | undefined, reduced: boolean, fresh: boolean) {
  const open = reduced || !fresh ? 1 : motion.settle(sweep(age, 0, .22)), fold = closing === undefined ? 0 : motion.settle(sweep(closing, 0, NT_FORM_CLOSE));
  return { frame: reduced ? 5 : closing === undefined ? Math.floor(Math.max(0, NA_TRA.formLife - remaining) / .12) % 12 : 12 + Math.min(3, Math.floor(closing / NT_FORM_CLOSE * 4)),
    width: reduced ? 1 : (.55 + .45 * open) * (1 - fold * .65), alpha: closing === undefined ? .25 + .65 * open : .9 * fadeOut(closing, 0, NT_FORM_CLOSE),
    wheel: reduced ? 0 : Math.floor(Math.max(0, NA_TRA.formLife - remaining) / .065) % 8, scale: reduced ? 1 : 1 - fold * .8 };
}

