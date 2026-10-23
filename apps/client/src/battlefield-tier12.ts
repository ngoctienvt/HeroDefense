import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { VisualActor } from './visual-actors.js';
import { TIER12_BY_ID } from './visual-kit-recipes-tier12.js';

export type Tier12ReplayTarget = {
  showCast(event: GameEvent, at: Vector3): void;
  show(event: GameEvent, at: Vector3, origin?: Vector3, targets?: readonly Vector3[]): void;
  markHero(heroId: string, kind: string, id: string, at: Vector3): void;
};

/** Events each hero's `special` replay plays after its plain attack (skill ids as the server emits them). */
const SPECIALS: Readonly<Record<string, readonly string[]>> = {
  h001: ['trait-h001'],
  h002: ['bounce-h002', 'bounce-h002', 'mark-detonate-h002'],
  h003: ['burst-h003'],
  h004: ['trait-h004'],
  h005: ['nth-h005'],
  h006: ['follow-up-heal-h006'],
  h007: ['aura-ice-h007'],
  h008: ['burrow-h008'],
};

const FALLBACK_DISTANCE = 5;

/**
 * `?debug=1` only: replays a tier 1–2 recipe hero on the first one in view with client-only events.
 * kinds: `trait` (default: plain attack), `skill` (tier 2 active skill), `special` (the hero's extra events: crit, bounce, burst, quake…).
 * The target is the nearest enemy, `point` if given, else in front of the caster.
 */
export function replayTier12(heroId: string, actors: Map<string, VisualActor>, zone: number,
  effects: Tier12ReplayTarget, focus?: (x: number, z: number) => void,
  options: { kind?: string; point?: { x: number; z: number } } = {}): boolean {
  if (!TIER12_BY_ID.has(heroId)) return false;
  const entries = [...actors.entries()].filter(([, actor]) => actor.zone === zone && actor.hp > 0 && !actor.dying);
  const caster = entries.find(([, actor]) => actor.heroId === heroId);
  if (!caster) { debug('visual.tier12.replay.skip', { heroId, reason: 'no-caster' }); return false; }
  const [sourceId, source] = caster;
  const origin = source.root.position.clone();
  const nearest = entries.filter(([, actor]) => !actor.heroId).map(([, actor]) => actor.root.position)
    .sort((a, b) => Vector3.Distance(a, origin) - Vector3.Distance(b, origin))[0];
  const point = options.point ? new Vector3(options.point.x, 0, options.point.z)
    : nearest ? new Vector3(nearest.x, 0, nearest.z) : new Vector3(origin.x, 0, origin.z - FALLBACK_DISTANCE);
  focus?.(point.x, point.z);
  const base = { source: sourceId, zone, x: point.x, z: point.z } as const;
  let id = -20;
  const play = (skillId: string, at: Vector3, from: Vector3, isCrit = false): void =>
    effects.show({ ...base, x: at.x, z: at.z, id: id--, kind: 'attack', skillId, isCrit }, at.clone(), from);
  const recipe = TIER12_BY_ID.get(heroId)!;
  if (options.kind === 'skill') {
    if (!recipe.skill) return false;
    // Cast telegraph, then the ability: per-ally events for shield/heal, one event with targets otherwise.
    const windup = .3;
    effects.showCast({ ...base, x: origin.x, z: origin.z, id: -30, kind: 'cast', skillId: `skill-${heroId}`, windup }, origin.clone());
    const spread = [0, 1, 2].map(i => point.add(new Vector3((i - 1) * 2, 0, i % 2)));
    const allies = [0, 1, 2].map(i => origin.add(new Vector3((i - 1) * 2.2, 0, 1.6 + i % 2)));
    setTimeout(() => {
      const ability = { ...base, id: -31, kind: 'ability', skillId: `skill-${heroId}` } as GameEvent;
      if (recipe.skill === 'shield' || recipe.skill === 'heal') {
        for (const ally of allies) effects.show({ ...ability, x: ally.x, z: ally.z }, ally.clone(), origin.clone());
      } else {
        effects.show({ ...ability, x: point.x, z: point.z }, recipe.skill === 'sweep' ? point.clone() : spread[0].clone(),
          origin.clone(), spread);
      }
    }, windup * 1000);
    debug('visual.tier12.replay', { heroId, kind: 'skill' });
    return true;
  }
  const special = options.kind === 'special';
  const skills = special ? SPECIALS[heroId] ?? [] : [`trait-${heroId}`];
  const SPACING = 350;
  skills.forEach((skillId, index) => setTimeout(() => {
    // Quake/aura events come from the caster's own spot; heals land on the caster's side.
    const atCaster = skillId.startsWith('burrow-') || skillId.startsWith('follow-up-heal-');
    const at = atCaster ? origin.add(new Vector3(1.6, 0, 0)) : point.add(new Vector3(index * 1.4, 0, 0));
    play(skillId, skillId.startsWith('burrow-') ? origin : at, origin, heroId === 'h001');
  }, index * SPACING));
  if (heroId === 'h007') { // the standing shell is snapshot-driven in game: keep it marked while replaying
    const end = performance.now() + 4000;
    const step = (): void => {
      effects.markHero(heroId, 'shell', sourceId, origin);
      if (performance.now() < end) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  debug('visual.tier12.replay', { heroId, kind: options.kind ?? 'trait' });
  return true;
}
