import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { VisualActor } from './visual-actors.js';
import { DEFAULT_WINDUP, HEAL_RADIUS, MAX_HEAL_TARGETS, NHIEP_ID, NHIEP_SKILL, SHIELD_SECONDS } from './visual-nhieptieuthien-timeline.js';

/** Snapshot field the marker reads (a subset of Unit, so tests need no full GameState). */
export type NhiepSnapshotUnit = { heroId?: string; frostShield?: { remaining: number } };

/**
 * Which allies show the Frost Shield: the snapshot `frostShield` the server sets only when Tiểu Thiến's heal
 * overflowed (combat.ts, 5 s). Nothing is drawn from the cast event alone, so the shell never appears for a
 * heal that produced no shield. Debug replays force it briefly. Pure presentation; gameplay never reads this.
 */
export class NhiepTracker {
  private forced = new Map<string, number>();

  constructor(private now: () => number = () => performance.now() / 1000) {}

  shield(id: string, unit: NhiepSnapshotUnit): boolean {
    if (!unit.heroId) return false;
    return Boolean(unit.frostShield && unit.frostShield.remaining > 0) || this.isForced(id);
  }

  force(ids: readonly string[], seconds: number): void {
    const until = this.now() + seconds;
    for (const id of ids) this.forced.set(id, until);
  }

  clear(): void { this.forced.clear(); }

  private isForced(id: string): boolean { return (this.forced.get(id) ?? 0) > this.now(); }
}

export type NhiepReplayTarget = {
  showCast(event: GameEvent, at: Vector3): void;
  show(event: GameEvent, at: Vector3, origin?: Vector3, targets?: readonly Vector3[]): void;
};

/**
 * `?debug=1` only: a client-only cast on the first Tiểu Thiến in view, so the skill can be reviewed without waiting
 * for the cooldown. Windup → wreath → note ribbons to up to 3 allies within the heal radius (nearest first; two
 * points beside her when she is alone), Frost Shield on those allies for 5 s.
 */
export function replayNhieptieuthien(actors: Map<string, VisualActor>, zone: number, effects: NhiepReplayTarget,
  tracker: NhiepTracker, focus?: (x: number, z: number) => void): boolean {
  const entries = [...actors.entries()].filter(([, actor]) => actor.zone === zone && actor.hp > 0 && !actor.dying);
  const caster = entries.find(([, actor]) => actor.heroId === NHIEP_ID);
  if (!caster) { debug('visual.nhieptieuthien.replay.skip', { reason: 'no-caster' }); return false; }
  const [sourceId, source] = caster;
  const at = source.root.position.clone();
  focus?.(at.x, at.z);
  const base = { source: sourceId, zone } as const;
  effects.showCast({ ...base, id: -50, kind: 'cast', ability: 'heal', skillId: NHIEP_SKILL, x: at.x, z: at.z,
    windup: DEFAULT_WINDUP }, at);
  setTimeout(() => {
    const origin = source.root.position.clone();
    const allies = entries.filter(([id, actor]) => id !== sourceId && actor.heroId && actor.root.position.subtract(origin).length() <= HEAL_RADIUS)
      .sort((a, b) => a[1].root.position.subtract(origin).length() - b[1].root.position.subtract(origin).length())
      .slice(0, MAX_HEAL_TARGETS);
    tracker.force(allies.map(([id]) => id), SHIELD_SECONDS);
    const points = allies.length ? allies.map(([, actor]) => actor.root.position.clone())
      : [new Vector3(origin.x - 3.2, 0, origin.z + 1.2), new Vector3(origin.x + 3.2, 0, origin.z + 1.2)];
    effects.show({ ...base, id: -51, kind: 'ability', ability: 'heal', skillId: NHIEP_SKILL, targets: allies.map(([id]) => id),
      x: origin.x, z: origin.z }, origin, origin, points);
  }, DEFAULT_WINDUP * 1000);
  debug('visual.nhieptieuthien.replay', { kind: 'skill' });
  return true;
}
