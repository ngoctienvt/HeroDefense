import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { VisualActor } from './visual-actors.js';
import { ARRAY_SECONDS, DEFAULT_WINDUP, LADONGTAN_ARRAY_MARK, LADONGTAN_ID, LADONGTAN_SKILL, STRIKE_RADIUS } from './visual-ladongtan-timeline.js';

/** Snapshot ground effect fields the marker reads (a subset of GameState.groundEffects, so tests need no full state). */
export type LadongtanGround = { x: number; z: number; remaining: number; casterId: string; kind?: string };

/**
 * Lã Động Tân's sword array is the server ground effect his skill pushes (combat.ts `groundBurnSeconds`): no `kind`,
 * no `id`, owned by an h00D caster. Every other ground effect (other heroes, tier painters, `kind` set) is not his.
 * Pure presentation; gameplay never reads this.
 */
export function isLadongtanArray(ground: LadongtanGround, casterHeroId: string | undefined): boolean {
  return casterHeroId === LADONGTAN_ID && ground.kind === undefined && ground.remaining > 0;
}

/** Stable id of one array across snapshots (same caster, same landing point). */
export function ladongtanArrayId(ground: Pick<LadongtanGround, 'casterId' | 'x' | 'z'>): string {
  return `${ground.casterId}@${ground.x.toFixed(1)},${ground.z.toFixed(1)}`;
}

export type LadongtanReplayTarget = {
  showCast(event: GameEvent, at: Vector3): void;
  show(event: GameEvent, at: Vector3, origin?: Vector3, targets?: readonly Vector3[]): void;
  markHero(heroId: string, kind: string, id: string, at: Vector3): void;
};

/** Debug replays feed the array marks by timer (the real ones come from the snapshot); cleared with the zone. */
export class LadongtanTracker {
  private timers = new Set<ReturnType<typeof setTimeout | typeof setInterval>>();

  /** Runs `fn` after `delay` ms; cancelled by clear(). */
  later(delay: number, fn: () => void): void {
    const timer = setTimeout(() => { this.timers.delete(timer); fn(); }, delay);
    this.timers.add(timer);
  }

  /** Runs `fn` every `step` ms for `seconds`; cancelled by clear(). */
  every(step: number, seconds: number, fn: () => void): void {
    const started = performance.now();
    const timer = setInterval(() => {
      if (performance.now() - started >= seconds * 1000) { clearInterval(timer); this.timers.delete(timer); return; }
      fn();
    }, step);
    this.timers.add(timer);
  }

  clear(): void {
    for (const timer of this.timers) { clearTimeout(timer as ReturnType<typeof setTimeout>); clearInterval(timer as ReturnType<typeof setInterval>); }
    this.timers.clear();
  }
}

/**
 * `?debug=1` only: a client-only cast by the first Lã Động Tân in view, on the nearest monster (or a point ahead of
 * him when none): windup + falling sword → bite and shock wave → the sword array for 3 s (marks fed by timer).
 */
export function replayLadongtan(actors: Map<string, VisualActor>, zone: number, effects: LadongtanReplayTarget,
  tracker: LadongtanTracker, focus?: (x: number, z: number) => void): boolean {
  const entries = [...actors.entries()].filter(([, actor]) => actor.zone === zone && actor.hp > 0 && !actor.dying);
  const caster = entries.find(([, actor]) => actor.heroId === LADONGTAN_ID);
  if (!caster) { debug('visual.ladongtan.replay.skip', { reason: 'no-caster' }); return false; }
  const [sourceId, source] = caster;
  const origin = source.root.position.clone();
  const nearest = entries.filter(([, actor]) => !actor.heroId)
    .sort((a, b) => a[1].root.position.subtract(origin).length() - b[1].root.position.subtract(origin).length())[0];
  const at = nearest ? nearest[1].root.position.clone() : new Vector3(origin.x + STRIKE_RADIUS + 1.5, 0, origin.z);
  focus?.(at.x, at.z);
  const base = { source: sourceId, zone, ability: 'nova', skillId: LADONGTAN_SKILL, x: at.x, z: at.z } as const;
  effects.showCast({ ...base, id: -60, kind: 'cast', target: nearest?.[0], windup: DEFAULT_WINDUP }, at);
  tracker.later(DEFAULT_WINDUP * 1000, () => {
    effects.show({ ...base, id: -61, kind: 'ability', target: nearest?.[0], targets: nearest ? [nearest[0]] : [] }, at, origin, nearest ? [at] : []);
    const id = ladongtanArrayId({ casterId: sourceId, x: at.x, z: at.z });
    tracker.later(60, () => tracker.every(33, ARRAY_SECONDS, () => effects.markHero(LADONGTAN_ID, LADONGTAN_ARRAY_MARK, id, at)));
  });
  debug('visual.ladongtan.replay', { kind: 'skill', monster: Boolean(nearest) });
  return true;
}
