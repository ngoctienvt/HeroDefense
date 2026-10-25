import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import { skillRadius } from './visual-kit-recipe-geometry.js';
import type { RunContext } from './visual-kit-recipe-runner.js';
import { pulseGate, slashArc } from './visual-kit-recipe-timeline.js';
import { ELEMENT_KITS, type TierRecipe } from './visual-kit-recipes-tier12.js';
import { unitDirection } from './visual-kit-timeline.js';
import type { TierMotif } from './visual-tier-motif-textures.js';

/**
 * Tier 2 active skills. The hero's MAIN SHAPE is its own authored flipbook (vfx-huyen-<motif>, the Hà Bá
 * whirlpool, the fire module); the kit adds the supporting layers underneath (held ground decal, link ribbon,
 * ward dome, debris). The motif is what tells one hero from another, so it is data (`SKILL_LOOKS`), never a
 * shared burst. Radius, targets and times come from the server event / catalog, never from here.
 */
interface SkillLook {
  /** Main flipbook at the target / ally / centre; size 0 = derive from the skill radius. */
  readonly motif?: TierMotif;
  readonly motifSize: number;
  readonly motifSeconds: number;
  /** Flipbook that travels from the caster first (bell, seed, sand, sniper, soul, flower, song). */
  readonly flight?: TierMotif;
  readonly flightSize: number;
  /** Lay the main flipbook flat on the floor and spin it (sand swirl, fire sweep). */
  readonly flat?: number;
}

const SKILL_LOOKS: Readonly<Record<string, SkillLook>> = {
  h00B: { motif: 'sand', motifSize: 0, motifSeconds: 1.15, flight: 'sand', flightSize: 3.2, flat: 4.5 },
  h00C: { motif: 'fire-sweep', motifSize: 0, motifSeconds: .68, flightSize: 0, flat: 4.2 },
  h00D: { motif: 'sword', motifSize: 6.4, motifSeconds: .85, flight: 'sword', flightSize: 6.5 },
  h00F: { motif: 'flower', motifSize: 3.2, motifSeconds: 1, flight: 'flower', flightSize: 2.1 },
  h00H: { motif: 'sniper', motifSize: 3.2, motifSeconds: .48, flight: 'sniper', flightSize: 2.8 },
  h00I: { motif: 'soul', motifSize: 2.8, motifSeconds: .75, flight: 'soul', flightSize: 2.2 },
  h03O: { motif: 'song', motifSize: 2.8, motifSeconds: .78, flight: 'song', flightSize: 1.9 },
  h03P: { motif: 'bloom', motifSize: 4.8, motifSeconds: 1, flight: 'seed', flightSize: 2.5 },
};

export const skillLook = (heroId: string): SkillLook | undefined => SKILL_LOOKS[heroId];

const HAND = 1.1, CHEST = .9;
const lift = (v: Vector3, y: number): Vector3 => new Vector3(v.x, y, v.z);

function thread(ctx: RunContext, r: TierRecipe, from: Vector3, to: Vector3, reduced: boolean, share = 1): void {
  if (r.ribbon) {
    ctx.bank.ribbon(lift(from, HAND), lift(to, CHEST), r.palette, { ...r.ribbon, reduced, width: r.ribbon.width * share });
  }
}

/** Flipbook flies from the caster (or lands on the spot when the target is the caster), then `arrive` runs. */
function fly(ctx: RunContext, look: SkillLook, from: Vector3, to: Vector3, reduced: boolean, arrive: () => void): void {
  if (!look.flight || look.flightSize <= 0 || Vector3.DistanceSquared(from, to) < .5) { arrive(); return; }
  ctx.accents.motifTravel(from.clone(), to.clone(), look.flight, look.flightSize, .22, arrive, reduced);
}

function landMotif(ctx: RunContext, look: SkillLook, at: Vector3, reduced: boolean, radius = 0): void {
  if (!look.motif) return;
  const size = look.motifSize || radius * 2;
  ctx.accents.motifShow(at.clone(), look.motif, size, look.motifSeconds, reduced, look.flat !== undefined, look.flat ?? 0);
}

/** Telegraph while the server windup runs: ring on the caster at the skill radius, motes pulled inward. */
export function paintSkillCast(ctx: RunContext, r: TierRecipe, event: GameEvent, at: Vector3, reduced: boolean): boolean {
  if (!r.skill) return false;
  const radius = Math.min(skillRadius(r.heroId) || 3, 4);
  ctx.bank.ring(at, radius * .6, r.palette, { life: Math.max(.2, event.windup ?? .3), fill: .12, order: 3, reduced });
  if (!reduced) ctx.bank.spray(r.spray ?? ELEMENT_KITS[r.element].spray).rise(at, radius * .5, 8);
  debug('visual.tier12.cast', { eventId: event.id, hero: r.heroId, skill: r.skill });
  return true;
}

/** Shield/heal reach each ally in its own event (position = ally, origin = caster). */
function allyBoon(ctx: RunContext, r: TierRecipe, event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean): void {
  const look = SKILL_LOOKS[r.heroId];
  const radius = skillRadius(r.heroId) || 4;
  if (pulseGate(ctx.pulses, `skill-${event.id}`, ctx.now(), .15)) {
    ctx.bank.ring(origin, radius, r.palette, { life: .6, fill: 0, order: 3, alpha: .6, reduced });
  }
  if (!look) return;
  fly(ctx, look, origin, at, reduced, () => {
    landMotif(ctx, look, at, reduced);
    if (r.skill === 'shield') ctx.bank.dome(at, r.palette, { x: 2.2, y: 1.9 }, 1.1, reduced);
    else if (!reduced) ctx.bank.spray(ELEMENT_KITS[r.element].spray).rise(at, 1, 6);
  });
}

/** Chain: the authored flipbook hops through the server targets in order; single-target skills use one hop. */
function chain(ctx: RunContext, r: TierRecipe, origin: Vector3, targets: readonly Vector3[], at: Vector3,
  reduced: boolean): void {
  const look = SKILL_LOOKS[r.heroId];
  if (!look) return;
  const hops = r.heroId === 'h00H' ? [at] : (targets.length ? targets : [at]);
  let from = origin;
  hops.forEach((hop, index) => {
    const start = from.clone(), end = hop.clone();
    const run = (): void => {
      thread(ctx, r, start, end, reduced, .7);
      fly(ctx, look, start, end, reduced, () => landMotif(ctx, look, end, reduced));
    };
    if (index === 0 || reduced) run(); else ctx.bank.after(index * .16, run);
    from = hop;
  });
}

/** Nova: the hero's own impact shape at the server's centre (sword rain, whirlpool, bloom) + a held decal. */
function nova(ctx: RunContext, r: TierRecipe, origin: Vector3, at: Vector3, reduced: boolean): void {
  const radius = skillRadius(r.heroId) || 4;
  const look = SKILL_LOOKS[r.heroId];
  const spray = ctx.bank.spray(r.spray ?? ELEMENT_KITS[r.element].spray);
  if (r.heroId === 'h00G') { // Hà Bá: the authored whirlpool prison (pull + slow for the server's seconds)
    ctx.accents.waterImpact(at.clone(), radius, 3.5, reduced);
    if (!reduced) spray.rise(at, radius * .8, 16);
    return;
  }
  const land = (): void => {
    if (look) landMotif(ctx, look, at, reduced);
    ctx.bank.ring(at, radius, r.palette, { life: 2.4, fill: .5, hold: true, order: 3, alpha: .7, reduced });
    if (r.heroId === 'h00D') ctx.accents.fireImpact(at.clone(), true, radius);
    if (!reduced) spray.ring(at, radius * .4, 12, .3, 3.2, 5);
  };
  if (!look?.flight) { land(); return; }
  if (r.heroId === 'h00D') { // the great sword drops from above the centre
    ctx.accents.motifTravel(at.add(new Vector3(0, 9, 0)), at.clone(), 'sword', look.flightSize, .28, land, reduced);
    return;
  }
  fly(ctx, look, origin, at, reduced, land);
}

/** Sweep around the caster: the authored flipbook plus crescents on the skill radius (two opposed ones = 360°). */
function sweep(ctx: RunContext, r: TierRecipe, event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean): void {
  const radius = skillRadius(r.heroId) || 3.8;
  const look = SKILL_LOOKS[r.heroId];
  const dir = unitDirection(event, origin) ?? unitDirection({ x: at.x, z: at.z }, origin) ?? { x: 1, z: 0 };
  const arc = r.sweepArc ?? slashArc(Math.PI * 2);
  const turns = r.sweepArc ? [0] : [0, Math.PI];
  for (const turn of turns) {
    const c = Math.cos(turn), s = Math.sin(turn);
    ctx.bank.slash(origin, { x: dir.x * c - dir.z * s, z: dir.x * s + dir.z * c }, radius, arc, r.palette, .42, reduced);
  }
  ctx.bank.ring(origin, radius, r.palette, { life: .9, fill: .3, hold: true, order: 3, alpha: .6, reduced });
  if (!look) return;
  if (r.heroId === 'h00C') { // spear spin: the flat fire sweep on the caster plus the fire module's flames
    landMotif(ctx, look, origin, reduced, radius);
    ctx.accents.fireImpact(origin.clone(), false, radius);
    return;
  }
  const centre = at.clone(); // fan: sand flies to the cluster and swirls on the floor
  fly(ctx, look, origin, centre, reduced, () => landMotif(ctx, look, centre, reduced, radius));
}

/** Ability event of a tier 2 skill; true once painted. */
export function paintSkill(ctx: RunContext, r: TierRecipe, event: GameEvent, origin: Vector3, at: Vector3,
  targets: readonly Vector3[], reduced: boolean): boolean {
  switch (r.skill) {
    case 'shield': case 'heal': allyBoon(ctx, r, event, origin, at, reduced); break;
    case 'chain': chain(ctx, r, origin, targets, at, reduced); break;
    case 'nova': nova(ctx, r, origin, at, reduced); break;
    case 'sweep': sweep(ctx, r, event, origin, at, reduced); break;
    default: return false;
  }
  debug('visual.tier12.skill', { eventId: event.id, hero: r.heroId, skill: r.skill, targets: targets.length });
  return true;
}
