import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { VisualActor } from './visual-actors.js';
import { BURN_SECONDS, DEFAULT_WINDUP, HONGHAINHI_ID, HONGHAINHI_SKILL, SKILL_RADIUS } from './visual-honghainhi-timeline.js';

/** Snapshot field the marker reads (a subset of Enemy, so tests need no full GameState). */
export type HonghainhiSnapshotEnemy = { burn?: { remaining: number; casterId: string } };

/**
 * Which enemies carry Hồng Hài Nhi's flame column: the snapshot `burn` whose caster is an h00C unit (combat.ts sets
 * `burn { remaining: 4 }` on every enemy her skill hits; other heroes' burns name another caster hero id and keep their
 * own painter). Debug replays force it for the replay's 4 s. Pure presentation; gameplay never reads this.
 */
export class HonghainhiTracker {
  private forced = new Map<string, number>();

  constructor(private now: () => number = () => performance.now() / 1000) {}

  /** `casterHeroId` = hero id of the unit named by `burn.casterId`. */
  burning(id: string, enemy: HonghainhiSnapshotEnemy, casterHeroId: string | undefined): boolean {
    const mine = casterHeroId === HONGHAINHI_ID && (enemy.burn?.remaining ?? 0) > 0;
    return mine || (this.forced.get(id) ?? 0) > this.now();
  }

  force(ids: readonly string[], seconds: number): void {
    const until = this.now() + seconds;
    for (const id of ids) this.forced.set(id, until);
  }

  clear(): void { this.forced.clear(); }
}

export type HonghainhiReplayTarget = {
  showCast(event: GameEvent, at: Vector3): void;
  show(event: GameEvent, at: Vector3, origin?: Vector3, targets?: readonly Vector3[]): void;
};

/**
 * `?debug=1` only: a client-only cast on the first Hồng Hài Nhi in view, so the skill can be reviewed without waiting
 * for the cooldown. Windup → 360 degree sweep → scorched ring, with a flame column for 4 s on every enemy within 4.2.
 */
export function replayHonghainhi(actors: Map<string, VisualActor>, zone: number, effects: HonghainhiReplayTarget,
  tracker: HonghainhiTracker, focus?: (x: number, z: number) => void): boolean {
  const entries = [...actors.entries()].filter(([, actor]) => actor.zone === zone && actor.hp > 0 && !actor.dying);
  const caster = entries.find(([, actor]) => actor.heroId === HONGHAINHI_ID);
  if (!caster) { debug('visual.honghainhi.replay.skip', { reason: 'no-caster' }); return false; }
  const [sourceId, source] = caster;
  const at = source.root.position.clone();
  focus?.(at.x, at.z);
  const base = { source: sourceId, zone } as const;
  effects.showCast({ ...base, id: -50, kind: 'cast', ability: 'cleave', skillId: HONGHAINHI_SKILL, x: at.x, z: at.z,
    windup: DEFAULT_WINDUP }, at);
  setTimeout(() => {
    const origin = source.root.position.clone();
    const hit = entries.filter(([, actor]) => !actor.heroId && actor.root.position.subtract(origin).length() <= SKILL_RADIUS);
    tracker.force(hit.map(([id]) => id), BURN_SECONDS);
    effects.show({ ...base, id: -51, kind: 'ability', ability: 'cleave', skillId: HONGHAINHI_SKILL, targets: hit.map(([id]) => id),
      x: origin.x, z: origin.z }, origin, origin, hit.map(([, actor]) => actor.root.position.clone()));
  }, DEFAULT_WINDUP * 1000);
  debug('visual.honghainhi.replay', { kind: 'skill', enemies: entries.filter(([, actor]) => !actor.heroId).length });
  return true;
}
