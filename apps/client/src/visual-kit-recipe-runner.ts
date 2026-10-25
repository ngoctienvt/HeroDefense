import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { KitAuraShell } from './visual-kit-aura-shell.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { HeroVfxHost } from './visual-hero-adapter.js';
import { attackReach, auraRadius, nthRadius } from './visual-kit-recipe-geometry.js';
import { paintSkill } from './visual-kit-recipe-skills.js';
import { pulseGate, previousHit, slashArc, type HitPoint } from './visual-kit-recipe-timeline.js';
import { ELEMENT_KITS, type TierRecipe } from './visual-kit-recipes-tier12.js';
import { unitDirection } from './visual-kit-timeline.js';

/** Shared state of one recipe host: the effect bank, aura shells and the little memories bounce/aura need. */
export interface RunContext {
  readonly bank: KitFxBank;
  readonly aura: KitAuraShell;
  /** The authored per-skill flipbooks (vfx-huyen-*), water and fire modules: the hero's main shape. */
  readonly accents: HeroVfxHost;
  readonly hits: Map<string, HitPoint>;
  readonly pulses: Map<string, number>;
  now(): number;
}

interface Impact {
  flip: 'hit' | 'burst'; scale: number; ring: number; debris: number;
  fill?: number; hold?: boolean; order?: number; life?: number;
}

const HAND = 1.1, CHEST = .9;
const lift = (v: Vector3, y: number): Vector3 => new Vector3(v.x, y, v.z);

/** Impact = three layers: library flipbook, spray debris, ground decal. Reduced motion keeps only the decal. */
function impact(ctx: RunContext, r: TierRecipe, at: Vector3, o: Impact, reduced: boolean): void {
  const kit = ELEMENT_KITS[r.element];
  ctx.bank.ring(at, o.ring, r.palette, { life: o.life ?? (o.hold ? 1.2 : .55), fill: o.fill ?? .3, hold: o.hold,
    order: o.order, reduced });
  if (reduced) return;
  ctx.bank.flip(kit[o.flip], at, o.scale, { tint: r.tint });
  ctx.bank.spray(kit.spray).ring(at, o.ring * .35, o.debris, .3, 3, 4.5);
}

/** The server event kind prefix: `follow-up-heal-h006` → `follow-up-heal`. */
function skillKind(skillId: string): string {
  return skillId.slice(0, skillId.lastIndexOf('-'));
}

function ribbon(ctx: RunContext, r: TierRecipe, from: Vector3, to: Vector3, reduced: boolean): void {
  if (!r.ribbon) return;
  ctx.bank.ribbon(lift(from, HAND), lift(to, CHEST), r.palette, { ...r.ribbon, reduced });
}

function basicBeam(ctx: RunContext, r: TierRecipe, event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean): void {
  ribbon(ctx, r, origin, at, reduced);
  impact(ctx, r, at, { flip: 'hit', scale: r.hitScale, ring: event.isCrit ? 1.2 : .7, debris: event.isCrit ? 9 : 4,
    fill: event.isCrit ? .45 : .2 }, reduced);
}

function basicBounce(ctx: RunContext, r: TierRecipe, event: GameEvent, origin: Vector3, at: Vector3, kind: string,
  reduced: boolean): void {
  const previous = previousHit(ctx.hits, event.source ?? '', at, ctx.now());
  const from = previous && kind === 'bounce' ? new Vector3(previous.x, 0, previous.z) : origin;
  ribbon(ctx, r, from, at, reduced);
  impact(ctx, r, at, { flip: 'hit', scale: r.hitScale, ring: kind === 'bounce' ? .8 : 1.1, debris: 4, fill: .15 }, reduced);
}

function basicCleave(ctx: RunContext, r: TierRecipe, event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean): void {
  const reach = attackReach(r.heroId);
  const direction = unitDirection(event, origin);
  if (!direction || !reach) { debug('visual.tier12.skip', { eventId: event.id, hero: r.heroId, reason: 'no-direction' }); return; }
  ctx.bank.slash(origin, direction, reach.reach, slashArc(reach.angle ?? Math.PI), r.palette, .34, reduced);
  impact(ctx, r, at, { flip: 'hit', scale: r.hitScale, ring: .8, debris: 5 }, reduced);
}

function basicThrust(ctx: RunContext, r: TierRecipe, event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean): void {
  const reach = attackReach(r.heroId);
  const direction = unitDirection(event, origin);
  if (!direction || !reach) { debug('visual.tier12.skip', { eventId: event.id, hero: r.heroId, reason: 'no-direction' }); return; }
  const start = new Vector3(origin.x + direction.x * .8, 0, origin.z + direction.z * .8);
  const tip = new Vector3(origin.x + direction.x * reach.reach, 0, origin.z + direction.z * reach.reach);
  ribbon(ctx, r, start, tip, reduced);
  impact(ctx, r, at, { flip: 'hit', scale: r.hitScale, ring: .8, debris: 5 }, reduced);
}

function basicVolley(ctx: RunContext, r: TierRecipe, event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean): void {
  const direction = unitDirection(event, origin) ?? unitDirection({ x: at.x, z: at.z }, origin);
  const side = direction ? { x: -direction.z * .4, z: direction.x * .4 } : { x: 0, z: 0 };
  for (const sign of [-1, 1]) {
    ribbon(ctx, r, new Vector3(origin.x + side.x * sign, 0, origin.z + side.z * sign),
      new Vector3(at.x + side.x * sign, 0, at.z + side.z * sign), reduced);
  }
  impact(ctx, r, at, { flip: 'hit', scale: r.hitScale, ring: .9, debris: 6 }, reduced);
}

function basicSplash(ctx: RunContext, r: TierRecipe, origin: Vector3, at: Vector3, reduced: boolean): void {
  const reach = attackReach(r.heroId)?.reach ?? 2;
  if (r.basicRibbon) ribbon(ctx, r, origin, at, reduced);
  impact(ctx, r, at, { flip: 'hit', scale: r.hitScale, ring: reach, debris: 9, fill: r.basicRibbon ? .45 : .3 }, reduced);
  if (r.heroId === 'h006' && !reduced) {
    const petals = ctx.bank.spray(ELEMENT_KITS[r.element].spray);
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.random() * reach * .8;
      petals.trail(new Vector3(at.x + Math.cos(a) * d, 3 + Math.random(), at.z + Math.sin(a) * d),
        new Vector3(0, -1.5, 0), 1);
    }
  }
}

function basicAura(ctx: RunContext, r: TierRecipe, at: Vector3, reduced: boolean): void {
  impact(ctx, r, at, { flip: 'hit', scale: r.hitScale, ring: .7, debris: 4, fill: .15 }, reduced);
}

function basicQuake(ctx: RunContext, r: TierRecipe, at: Vector3, reduced: boolean): void {
  impact(ctx, r, at, { flip: 'hit', scale: r.hitScale, ring: .9, debris: 6 }, reduced);
}

function basic(ctx: RunContext, r: TierRecipe, event: GameEvent, origin: Vector3, at: Vector3, kind: string,
  reduced: boolean): void {
  switch (r.archetype) {
    case 'beam': return basicBeam(ctx, r, event, origin, at, reduced);
    case 'bounce': return basicBounce(ctx, r, event, origin, at, kind, reduced);
    case 'cleave': return basicCleave(ctx, r, event, origin, at, reduced);
    case 'thrust': return basicThrust(ctx, r, event, origin, at, reduced);
    case 'volley': return basicVolley(ctx, r, event, origin, at, reduced);
    case 'splash': return basicSplash(ctx, r, origin, at, reduced);
    case 'aura': return basicAura(ctx, r, at, reduced);
    case 'quake': return basicQuake(ctx, r, at, reduced);
  }
}

/** Server-driven specials that are not the plain attack. Returns true when handled. */
function special(ctx: RunContext, r: TierRecipe, event: GameEvent, origin: Vector3, at: Vector3, kind: string,
  reduced: boolean): boolean {
  switch (kind) {
    case 'mark-detonate': // h002: five stacked marks burst
      impact(ctx, r, at, { flip: 'burst', scale: .5, ring: 1.6, debris: 14, fill: .5, life: .7 }, reduced);
      return true;
    case 'burst': { // h003: burning enemy dies and explodes (radius from the server rule)
      impact(ctx, r, at, { flip: 'burst', scale: .85, ring: 2, debris: 14, fill: .55, hold: true, life: 1.1 }, reduced);
      return true;
    }
    case 'nth': // h005 third shot: stun + knockback
      impact(ctx, r, at, { flip: 'burst', scale: .55, ring: 1.5, debris: 16, fill: .5, life: .7 }, reduced);
      return true;
    case 'burrow': { // h008: the dash ends, the ground cracks around the hero
      const radius = nthRadius(r.heroId) || 2.5;
      impact(ctx, r, at, { flip: 'burst', scale: radius / 2.4, ring: radius, debris: 16, fill: .7, hold: true, order: 3,
        life: 1.3 }, reduced);
      return true;
    }
    case 'follow-up-heal': // h006: life thread to the healed ally
      ribbon(ctx, r, origin, at, reduced);
      impact(ctx, r, at, { flip: 'hit', scale: r.hitScale, ring: 1, debris: 5, fill: .25 }, reduced);
      return true;
    case 'follow-up': // h006: the bonus strike has its own attack event
      return true;
    case 'aura-ice': { // h007: one ring per caster per pulse, not one per enemy
      if (r.archetype !== 'aura') { // other orbit-aura heroes: a pulse ring (h00F, h00G) or just flecks on the enemy (h003 burn)
        if (r.auraRing && pulseGate(ctx.pulses, event.source ?? '', ctx.now(), .4)) {
          ctx.bank.ring(origin, auraRadius(r.heroId) || 2.5, r.palette, { life: .5, fill: 0, alpha: .55, order: 3, reduced });
        }
        if (!reduced) ctx.bank.spray(ELEMENT_KITS[r.element].spray).trail(lift(at, .4), new Vector3(0, 2.2, 0), 2);
        return true;
      }
      const source = event.source ?? '';
      if (!pulseGate(ctx.pulses, source, ctx.now(), .4)) return true;
      ctx.aura.pulse(source);
      ctx.bank.ring(origin, auraRadius(r.heroId) || 2.8, r.palette, { life: .6, fill: 0, rim: 1, order: 3, reduced });
      if (!reduced) ctx.bank.spray(ELEMENT_KITS[r.element].spray).ring(origin, auraRadius(r.heroId) * .8, 6, .2, 1.2, 2);
      return true;
    }
    default: return false;
  }
}

/** Routes one server event to the recipe's attack/special painter; false = not ours, fall back to the shared path. */
export function runTierRecipe(ctx: RunContext, r: TierRecipe, event: GameEvent, origin: Vector3, at: Vector3,
  reduced: boolean, targets: readonly Vector3[] = []): boolean {
  const kind = skillKind(event.skillId ?? '');
  if ((kind === 'skill' || kind === 'web') && r.skill) { // tier 2 active skill: the ability event paints; its per-target attack echoes stay silent
    return event.kind === 'ability' ? paintSkill(ctx, r, event, origin, at, targets, reduced) : true;
  }
  const handled = special(ctx, r, event, origin, at, kind, reduced);
  if (!handled) {
    // Tier 2 basic attacks keep their authored per-hero painters (projectile motifs, Hà Bá water orbs)
    if (r.skill || (kind !== 'trait' && kind !== 'bounce')) return false;
    basic(ctx, r, event, origin, at, kind, reduced);
  }
  debug('visual.tier12.event', { eventId: event.id, hero: r.heroId, kind, archetype: r.archetype, crit: Boolean(event.isCrit) });
  return true;
}
