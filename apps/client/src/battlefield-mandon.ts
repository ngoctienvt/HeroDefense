import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { VisualActor } from './visual-actors.js';
import { DEFAULT_WINDUP, HASTE_AMOUNT, HASTE_ATTACK_BONUS, HEAL_RADIUS, MANDON_ID, MANDON_SKILL, MAX_HEAL_TARGETS } from './visual-mandon-timeline.js';

/** Snapshot field the marker reads (a subset of Unit, so tests need no full GameState). */
export type MandonSnapshotUnit = { heroId?: string; haste?: { remaining: number; amount: number; attackBonus?: number } };

/**
 * Which allies show Mẫu Đơn's haste ring: the snapshot `haste` her skill sets (+35% amount with the +15% attack
 * bonus, combat.ts `hasteAllyMax`). Other heroes' haste never carries `attackBonus` .15, and her passive's
 * permanent +12% is a different amount, so neither draws the ring. Debug replays force it briefly.
 * Pure presentation; gameplay never reads this.
 */
export class MandonTracker {
  private forced = new Map<string, number>();

  constructor(private now: () => number = () => performance.now() / 1000) {}

  haste(id: string, unit: MandonSnapshotUnit): boolean {
    if (!unit.heroId) return false;
    const haste = unit.haste;
    const mine = Boolean(haste && haste.remaining > 0 && haste.attackBonus === HASTE_ATTACK_BONUS && haste.amount >= HASTE_AMOUNT);
    return mine || this.isForced(id);
  }

  force(ids: readonly string[], seconds: number): void {
    const until = this.now() + seconds;
    for (const id of ids) this.forced.set(id, until);
  }

  clear(): void { this.forced.clear(); }

  private isForced(id: string): boolean { return (this.forced.get(id) ?? 0) > this.now(); }
}

export type MandonReplayTarget = {
  showCast(event: GameEvent, at: Vector3): void;
  show(event: GameEvent, at: Vector3, origin?: Vector3, targets?: readonly Vector3[]): void;
};

/**
 * `?debug=1` only: a client-only cast on the first Mẫu Đơn in view, so the skill can be reviewed without waiting
 * for the cooldown. Windup → bloom → petal streams to up to 4 allies within the heal radius (nearest first; two
 * points beside her when she is alone), haste ring on those allies for 4.5 s.
 */
export function replayMandon(actors: Map<string, VisualActor>, zone: number, effects: MandonReplayTarget,
  tracker: MandonTracker, focus?: (x: number, z: number) => void): boolean {
  const entries = [...actors.entries()].filter(([, actor]) => actor.zone === zone && actor.hp > 0 && !actor.dying);
  const caster = entries.find(([, actor]) => actor.heroId === MANDON_ID);
  if (!caster) { debug('visual.mandon.replay.skip', { reason: 'no-caster' }); return false; }
  const [sourceId, source] = caster;
  const at = source.root.position.clone();
  focus?.(at.x, at.z);
  const base = { source: sourceId, zone } as const;
  effects.showCast({ ...base, id: -40, kind: 'cast', ability: 'heal', skillId: MANDON_SKILL, x: at.x, z: at.z,
    windup: DEFAULT_WINDUP }, at);
  setTimeout(() => {
    const origin = source.root.position.clone();
    const allies = entries.filter(([id, actor]) => id !== sourceId && actor.heroId && actor.root.position.subtract(origin).length() <= HEAL_RADIUS)
      .sort((a, b) => a[1].root.position.subtract(origin).length() - b[1].root.position.subtract(origin).length())
      .slice(0, MAX_HEAL_TARGETS);
    tracker.force(allies.map(([id]) => id), 4.5);
    const points = allies.length ? allies.map(([, actor]) => actor.root.position.clone())
      : [new Vector3(origin.x - 3.2, 0, origin.z + 1.2), new Vector3(origin.x + 3.2, 0, origin.z + 1.2)];
    effects.show({ ...base, id: -41, kind: 'ability', ability: 'heal', skillId: MANDON_SKILL, targets: allies.map(([id]) => id),
      x: origin.x, z: origin.z }, origin, origin, points);
  }, DEFAULT_WINDUP * 1000);
  debug('visual.mandon.replay', { kind: 'skill' });
  return true;
}
