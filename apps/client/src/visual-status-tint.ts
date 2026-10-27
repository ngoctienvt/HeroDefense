/**
 * Body tint for physical debuffs on an enemy: the model (or sprite) takes a soft pulsing colour overlay instead of a
 * floating icon or a sheet at its feet, so a crowded wave stays clean and the colour still says which effect it is.
 * Colours follow genre convention: fire orange, poison green, broken armour red, slow violet-blue, root earth-gold.
 * Several effects on one enemy take turns (one colour at a time, never a muddy mix). Presentation only; every kind is
 * read from its own server field. Abstract statuses (seal, attack-down, vulnerable, soul-link, armour-up) keep icons.
 */
export type StatusTintKind = 'burn' | 'poison' | 'armor-break' | 'slow' | 'root';

export type StatusTintSpec = { color: readonly [number, number, number]; /** peak overlay alpha */ alpha: number; /** pulses per second */ pulse: number };

export const STATUS_TINTS: Readonly<Record<StatusTintKind, StatusTintSpec>> = {
  burn: { color: [1, .42, .08], alpha: .46, pulse: 3.2 },
  poison: { color: [.36, .92, .18], alpha: .42, pulse: 1.4 },
  'armor-break': { color: [1, .14, .12], alpha: .4, pulse: 2 },
  slow: { color: [.48, .52, 1], alpha: .36, pulse: .9 },
  root: { color: [.78, .58, .2], alpha: .38, pulse: .9 },
};

/** Draw order when several effects take turns (damage over time first: it is what the player acts on). */
const ORDER: readonly StatusTintKind[] = ['burn', 'poison', 'armor-break', 'root', 'slow'];
/** Seconds each colour holds before the next active effect takes over. */
export const STATUS_TINT_TURN = .9;
/** Burn applied by these heroes is a poison in play (Mộc Tra, Nhiếp Tiểu Thiến's line). */
export const POISON_BURN_HEROES: readonly string[] = ['h00A', 'h03P'];

export type StatusTintSnapshot = {
  burn?: { remaining: number }; poison?: { remaining: number }; sunder?: { remaining: number };
  armorCuts?: { remaining: number }; slow?: number; root?: number;
};

/** Active tint kinds of one enemy this snapshot, in draw order. `burnCasterHero` = hero id that applied `burn`. */
export function statusTints(entity: StatusTintSnapshot, burnCasterHero?: string): StatusTintKind[] {
  const burning = (entity.burn?.remaining ?? 0) > 0;
  const burnPoison = burning && POISON_BURN_HEROES.includes(burnCasterHero ?? '');
  const active: Record<StatusTintKind, boolean> = {
    burn: burning && !burnPoison,
    poison: (entity.poison?.remaining ?? 0) > 0 || burnPoison,
    'armor-break': (entity.sunder?.remaining ?? 0) > 0 || (entity.armorCuts?.remaining ?? 0) > 0,
    slow: (entity.slow ?? 0) > 0,
    root: (entity.root ?? 0) > 0,
  };
  return ORDER.filter(kind => active[kind]);
}

/**
 * Overlay colour + alpha at `time` (seconds, per-actor phase already added). Pulse runs between 55 % and 100 % of the
 * peak; each colour fades in over its turn so the hand-over never pops. Reduced motion: first kind, steady.
 */
export function statusOverlay(kinds: readonly StatusTintKind[] | undefined, time: number, reduced: boolean):
  { r: number; g: number; b: number; a: number } | undefined {
  if (!kinds?.length) return undefined;
  const slot = reduced ? 0 : Math.floor(time / STATUS_TINT_TURN) % kinds.length;
  const spec = STATUS_TINTS[kinds[slot]!];
  let level = 1;
  if (!reduced) {
    const wave = .55 + .45 * (.5 + .5 * Math.sin(time * spec.pulse * Math.PI * 2));
    const into = (time % STATUS_TINT_TURN) / STATUS_TINT_TURN;
    level = wave * (kinds.length > 1 ? Math.min(1, into / .2, (1 - into) / .2 + .35) : 1);
  }
  return { r: spec.color[0], g: spec.color[1], b: spec.color[2], a: spec.alpha * level };
}

export type ActorOverlay = { r: number; g: number; b: number; a: number };
type OverlayMesh = { renderOverlay: boolean; overlayColor: { set(r: number, g: number, b: number): unknown }; overlayAlpha: number };

/** Hit flash (white, wins while it lasts; skipped in reduced motion) else the status tint, on every body mesh. */
export function applyActorOverlay(meshes: readonly OverlayMesh[], flash: number, tint: ActorOverlay | undefined, reduced: boolean): void {
  const flashing = !reduced && flash > 0;
  for (const mesh of meshes) {
    mesh.renderOverlay = flashing || Boolean(tint);
    if (flashing) { mesh.overlayColor.set(1, 1, 1); mesh.overlayAlpha = Math.min(.85, flash / .08 * .85); }
    else if (tint) { mesh.overlayColor.set(tint.r, tint.g, tint.b); mesh.overlayAlpha = tint.a; }
  }
}
