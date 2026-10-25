import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { VisualActor } from './visual-actors.js';
import { DEFAULT_WINDUP, FRENZY_SECONDS, MOCTRA_ID, MOCTRA_SKILL, VINE_REACH, VINE_SKILL } from './visual-moctra-timeline.js';

/** Snapshot fields the markers read (a subset of Unit/Enemy, so tests need no full GameState). */
export type MoctraSnapshotUnit = { heroId?: string; berserk?: { remaining: number } };
export type MoctraSnapshotEnemy = { poison?: { remaining: number; casterId: string } };

/**
 * Which actors show Mộc Tra's snapshot states: the frenzy wreath while his `berserk` holds, poison spores on
 * an enemy whose `poison` came from a Mộc Tra (vine shots). Debug replays force both briefly. Pure
 * presentation; gameplay never reads this.
 */
export class MoctraTracker {
  private forced = new Map<string, number>();

  constructor(private now: () => number = () => performance.now() / 1000) {}

  frenzy(id: string, unit: MoctraSnapshotUnit): boolean {
    if (unit.heroId !== MOCTRA_ID) return false;
    return (unit.berserk?.remaining ?? 0) > 0 || this.isForced(id);
  }

  /** `casterHeroId` = hero id of the unit named by `poison.casterId` (h03P also poisons; only h00A counts). */
  poisoned(id: string, enemy: MoctraSnapshotEnemy, casterHeroId: string | undefined): boolean {
    if (this.isForced(id)) return true;
    return (enemy.poison?.remaining ?? 0) > 0 && casterHeroId === MOCTRA_ID;
  }

  force(ids: readonly string[], seconds: number): void {
    const until = this.now() + seconds;
    for (const id of ids) this.forced.set(id, until);
  }

  clear(): void { this.forced.clear(); }

  private isForced(id: string): boolean { return (this.forced.get(id) ?? 0) > this.now(); }
}

export type MoctraReplayTarget = {
  showCast(event: GameEvent, at: Vector3): void;
  show(event: GameEvent, at: Vector3, origin?: Vector3, targets?: readonly Vector3[]): void;
};

export type MoctraReplayKind = 'skill' | 'vine';

const SHOT_PERIOD = .5;

/**
 * `?debug=1` only: client-only events on the first Mộc Tra in view, so the skill can be reviewed without
 * 100 Nộ. `skill` (default) = windup → awakening → 5 s frenzy with two vine shots every 0.5 s at the nearest
 * enemies in 4.5 (or two points ahead when the field is empty); `vine` = one pair of shots toward (x, z).
 */
export function replayMoctra(actors: Map<string, VisualActor>, zone: number, effects: MoctraReplayTarget,
  tracker: MoctraTracker, focus?: (x: number, z: number) => void,
  options: { kind?: MoctraReplayKind; point?: { x: number; z: number } } = {}): boolean {
  const entries = [...actors.entries()].filter(([, actor]) => actor.zone === zone && actor.hp > 0 && !actor.dying);
  const caster = entries.find(([, actor]) => actor.heroId === MOCTRA_ID);
  if (!caster) { debug('visual.moctra.replay.skip', { reason: 'no-caster' }); return false; }
  const [sourceId, source] = caster;
  const at = source.root.position.clone();
  focus?.(at.x, at.z);
  const base = { source: sourceId, zone } as const;
  const shoot = (serial: number): void => {
    const origin = source.root.position.clone();
    const enemies = entries.filter(([, actor]) => !actor.heroId && actor.root.position.subtract(origin).length() <= VINE_REACH)
      .sort((a, b) => a[1].root.position.subtract(origin).length() - b[1].root.position.subtract(origin).length())
      .slice(0, 2);
    tracker.force(enemies.map(([id]) => id), 2);
    const aim = options.point ? { x: options.point.x - origin.x, z: options.point.z - origin.z } : { x: 0, z: 1 };
    const length = Math.hypot(aim.x, aim.z) || 1;
    const points = enemies.length ? enemies.map(([, actor]) => actor.root.position.clone())
      : [-.35, .35].map(turn => {
        const c = Math.cos(turn), s = Math.sin(turn), x = aim.x / length, z = aim.z / length;
        return new Vector3(origin.x + (x * c - z * s) * 3.6, 0, origin.z + (x * s + z * c) * 3.6);
      });
    points.forEach((point, index) => effects.show({ ...base, id: -30 - serial * 2 - index, kind: 'attack',
      skillId: VINE_SKILL, x: point.x, z: point.z }, point, origin));
  };
  if (options.kind === 'vine') { shoot(0); debug('visual.moctra.replay', { kind: 'vine' }); return true; }
  effects.showCast({ ...base, id: -20, kind: 'cast', ability: 'cleave', skillId: MOCTRA_SKILL, x: at.x, z: at.z,
    windup: DEFAULT_WINDUP }, at);
  setTimeout(() => {
    tracker.force([sourceId], FRENZY_SECONDS);
    effects.show({ ...base, id: -21, kind: 'ability', ability: 'cleave', skillId: MOCTRA_SKILL, targets: [sourceId],
      x: at.x, z: at.z }, source.root.position.clone(), source.root.position.clone());
    const shots = Math.floor(FRENZY_SECONDS / SHOT_PERIOD) - 1;
    for (let i = 1; i <= shots; i++) setTimeout(() => shoot(i), i * SHOT_PERIOD * 1000);
  }, DEFAULT_WINDUP * 1000);
  debug('visual.moctra.replay', { kind: 'skill' });
  return true;
}
