import { segmentFrame } from './visual-kit-timeline.js';

/**
 * Game-wide status sheets from the shared Codex inventory (assets/vfx-source/shared-status/process-art.py): one neutral
 * silver-blue design per effect, whatever the hero's element. Data + pure phase math; meshes live in visual-shared-status.ts.
 * Hold sheets are P16 (form 4 · hold 8 looping · break 4); `once` sheets play start to end on a real event.
 */
export type SharedFxKind = 'stun' | 'freeze' | 'invulnerable' | 'heal' | 'revive';
/** Hold sheets that follow an actor; `heal` and `revive` are one-shots. Burn/poison/armour break are body tints instead. */
export const SHARED_HOLD_KINDS = ['stun', 'freeze', 'invulnerable'] as const satisfies readonly SharedFxKind[];
export const isSharedHoldKind = (kind: string): kind is (typeof SHARED_HOLD_KINDS)[number] =>
  (SHARED_HOLD_KINDS as readonly string[]).includes(kind);
export type SharedFxSpec = {
  url: string; columns: number; rows: number; frames: number;
  /** Plane edge in world units (cells are square). */
  size: number;
  /** Where the cell's anchor sits: `ground` = painted ground line at the feet, `body` = chest centre, `head` = above the head. */
  anchor: 'ground' | 'body' | 'head';
  /** `rear` sorts right behind the actor (hero/monster stays crisp); `front` is drawn over the crowd, under health bars. */
  layer: 'rear' | 'front';
  mode: 'hold' | 'once';
  secondsPerFrame: number;
};

export const SHARED_FX: Readonly<Record<SharedFxKind, SharedFxSpec>> = {
  stun: { url: '/assets/vfx-shared-stun.webp', columns: 4, rows: 4, frames: 16, size: 3.4, anchor: 'head', layer: 'front', mode: 'hold', secondsPerFrame: .09 },
  freeze: { url: '/assets/vfx-shared-freeze.webp', columns: 4, rows: 4, frames: 16, size: 5.6, anchor: 'ground', layer: 'rear', mode: 'hold', secondsPerFrame: .08 },
  invulnerable: { url: '/assets/vfx-shared-invulnerable.webp', columns: 4, rows: 4, frames: 16, size: 5.6, anchor: 'body', layer: 'rear', mode: 'hold', secondsPerFrame: .09 },
  heal: { url: '/assets/vfx-shared-heal.webp', columns: 4, rows: 2, frames: 8, size: 4.4, anchor: 'ground', layer: 'rear', mode: 'once', secondsPerFrame: .085 },
  revive: { url: '/assets/vfx-shared-revive.webp', columns: 4, rows: 4, frames: 16, size: 5.6, anchor: 'ground', layer: 'rear', mode: 'once', secondsPerFrame: .07 },
};

export const FX_FORM_FRAMES = 4;
export const FX_HOLD_FRAMES = 8;
export const FX_BREAK_FRAMES = 4;
export const FX_BREAK_SECONDS = FX_BREAK_FRAMES * .07;
/** Fraction of the plane height, from the top, where the painted ground line sits (cells keep 12 source px of margin). */
export const FX_GROUND_ANCHOR = .96;
/** Lift (world units up screen-up) of the body centre and the head anchor above the feet; hero hitbox is ~2.3 × 4.2. */
export const FX_BODY_LIFT = 2.2;
export const FX_HEAD_LIFT = 4.9;

/** Hold sheets: form once → looping hold while the snapshot keeps the status → break once when it ends. */
export function holdFrame(spec: SharedFxSpec, age: number, breakAge: number | undefined, reduced: boolean): number {
  if (breakAge !== undefined) return reduced ? FX_FORM_FRAMES + FX_HOLD_FRAMES + FX_BREAK_FRAMES - 1
    : segmentFrame(breakAge, FX_FORM_FRAMES + FX_HOLD_FRAMES, FX_BREAK_FRAMES, .07);
  if (reduced) return FX_FORM_FRAMES + 2;
  if (age < FX_FORM_FRAMES * spec.secondsPerFrame) return segmentFrame(age, 0, FX_FORM_FRAMES, spec.secondsPerFrame);
  return FX_FORM_FRAMES + Math.floor(age / spec.secondsPerFrame) % FX_HOLD_FRAMES;
}

/** The break plays once and the layer returns to the pool; reduced motion skips it. */
export const holdDone = (breakAge: number | undefined, reduced: boolean): boolean =>
  breakAge !== undefined && (reduced || breakAge >= FX_BREAK_SECONDS);

/** One-shot sheets (heal, revive): frame by age; reduced motion shows one still frame for a short beat. */
export function onceFrame(spec: SharedFxSpec, age: number, reduced: boolean): number {
  return reduced ? Math.floor(spec.frames / 2) : Math.min(spec.frames - 1, Math.floor(age / spec.secondsPerFrame));
}
export const onceSeconds = (spec: SharedFxSpec, reduced: boolean): number =>
  reduced ? .45 : spec.frames * spec.secondsPerFrame;
