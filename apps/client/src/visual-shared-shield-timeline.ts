/**
 * The one shield of the whole game: a neutral translucent white bubble (kitGuard shader, `guard` palette) so it reads
 * the same around a fire, wood, water or metal hero. Pure phase math; the mesh is driven in visual-shared-shield.ts.
 */
export const SHIELD_FORM_SECONDS = .22;
export const SHIELD_BREAK_SECONDS = .3;
/** Bubble around the ~2.3 × 4.2 hero body (hitbox size); centre rides `SHIELD_CHEST` up the screen-up axis. */
export const SHIELD_WIDTH = 4.6;
export const SHIELD_HEIGHT = 5.8;
export const SHIELD_CHEST = 2.3;

export type ShieldLook = { scale: number; alpha: number; dissolve: number };

const easeOutBack = (t: number): number => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;

/** Form (pop in with a small overshoot) → breathing hold while the snapshot still shows a shield → break (swell + dissolve). */
export function shieldLook(age: number, breakAge: number | undefined, reduced: boolean): ShieldLook {
  if (breakAge !== undefined) {
    const t = Math.min(1, breakAge / SHIELD_BREAK_SECONDS);
    return { scale: 1 + .12 * t, alpha: 1 - .6 * t * t, dissolve: .02 + .9 * t };
  }
  if (reduced) return { scale: 1, alpha: .85, dissolve: 0 };
  const t = Math.min(1, age / SHIELD_FORM_SECONDS);
  const breathe = age >= SHIELD_FORM_SECONDS ? .06 * Math.sin(age * 3.2) : 0;
  return { scale: .7 + .3 * easeOutBack(t), alpha: Math.min(1, t * 1.4) * (.92 + breathe), dissolve: 0 };
}

/** The break plays once and then the layer goes back to the pool; reduced motion skips it. */
export const shieldDone = (breakAge: number | undefined, reduced: boolean): boolean =>
  breakAge !== undefined && (reduced || breakAge >= SHIELD_BREAK_SECONDS);
