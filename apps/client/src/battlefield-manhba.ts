import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { VisualActor } from './visual-actors.js';
import { BOND_SECONDS, BOND_SHARE, MANHBA_ID, MANHBA_SKILL, MAX_LINKS } from './visual-manhba-timeline.js';

/** Snapshot field the tracker reads (a subset of Enemy, so tests need no full GameState). */
export type ManhbaSnapshotEnemy = { soulLink?: { remaining: number; sharePercent: number } };

/** Seconds past the bond a registered id stays owned (snapshot latency). */
const OWN_GRACE = 1;

/**
 * Which monsters show Mạnh Bà's Đồng Mệnh: those her `ability skill-h00I` just linked (the event's `targets`) that the
 * snapshot still reports with `soulLink` sharing 30% (combat.ts). Fu Xi's skill also sets `soulLink` but never lists
 * its monsters here, so it keeps the generic link markers. Pure presentation; gameplay never reads this.
 */
export class ManhbaTracker {
  private owned = new Map<string, number>();

  constructor(private now: () => number = () => performance.now() / 1000) {}

  /** Called on every `ability skill-h00I`: remember the linked monsters for the bond's lifetime. */
  register(ids: readonly string[]): void {
    const until = this.now() + BOND_SECONDS + OWN_GRACE;
    for (const id of ids) this.owned.set(id, until);
  }

  /** True while this monster is one of hers and the snapshot still holds the link. */
  bond(id: string, enemy: ManhbaSnapshotEnemy): boolean {
    const link = enemy.soulLink;
    return Boolean(link && link.remaining > 0 && Math.abs(link.sharePercent - BOND_SHARE) < 1e-6 && this.isOwned(id));
  }

  /** A soul-link group any of whose members is hers: her module draws it, the generic link markers skip it. */
  owns(group: readonly string[]): boolean { return group.some(id => this.isOwned(id)); }

  clear(): void { this.owned.clear(); }

  private isOwned(id: string): boolean { return (this.owned.get(id) ?? 0) > this.now(); }
}

export type ManhbaReplayTarget = {
  showCast(event: GameEvent, at: Vector3): void;
  show(event: GameEvent, at: Vector3, origin?: Vector3, targets?: readonly Vector3[]): void;
};

/** Chain order like combat.ts `chainTargets`: nearest to the caster first, then nearest unlinked to the previous one. */
export function chainOrder(origin: Vector3, entries: readonly [string, Vector3][], jumpRange: number): [string, Vector3][] {
  const dist = (a: Vector3, b: Vector3): number => Math.hypot(a.x - b.x, a.z - b.z);
  const pool = [...entries];
  const chain: [string, Vector3][] = [];
  while (pool.length && chain.length < MAX_LINKS) {
    const previous = chain.length ? chain[chain.length - 1][1] : origin;
    let index = -1;
    pool.forEach(([, at], i) => { if (dist(at, previous) <= jumpRange && (index < 0 || dist(at, previous) < dist(pool[index][1], previous))) index = i; });
    if (index < 0) break;
    chain.push(pool.splice(index, 1)[0]);
  }
  return chain;
}

/**
 * `?debug=1` only: a client-only cast on the first Mạnh Bà in view. Windup → pour → fan → ropes in chain order to up
 * to 4 monsters within 6 hops (real monsters when any are near, else four points ahead of her) → 4 s bond.
 */
export function replayManhba(actors: Map<string, VisualActor>, zone: number, effects: ManhbaReplayTarget,
  tracker: ManhbaTracker, focus?: (x: number, z: number) => void): boolean {
  const entries = [...actors.entries()].filter(([, actor]) => actor.zone === zone && actor.hp > 0 && !actor.dying);
  const caster = entries.find(([, actor]) => actor.heroId === MANHBA_ID);
  if (!caster) { debug('visual.manhba.replay.skip', { reason: 'no-caster' }); return false; }
  const [sourceId, source] = caster;
  const at = source.root.position.clone();
  focus?.(at.x, at.z);
  const base = { source: sourceId, zone } as const;
  effects.showCast({ ...base, id: -50, kind: 'cast', ability: 'chain', skillId: MANHBA_SKILL, x: at.x, z: at.z, windup: .25 }, at);
  setTimeout(() => {
    const origin = source.root.position.clone();
    const monsters = entries.filter(([id, actor]) => id !== sourceId && !actor.heroId && !actor.dying)
      .map(([id, actor]) => [id, actor.root.position.clone()] as [string, Vector3])
      .filter(([, position]) => Math.hypot(position.x - origin.x, position.z - origin.z) <= 12);
    const chain = chainOrder(origin, monsters, 6);
    const stand = [[-3, -2], [-6, -3.5], [-8.5, -1.5], [-11, -4]];
    const ids = chain.length ? chain.map(([id]) => id) : [];
    const points = chain.length ? chain.map(([, position]) => position)
      : stand.map(([dx, dz]) => new Vector3(origin.x + dx, 0, origin.z + dz));
    tracker.register(ids);
    effects.show({ ...base, id: -51, kind: 'ability', ability: 'chain', skillId: MANHBA_SKILL, targets: ids, target: ids[0],
      x: points[0].x, z: points[0].z }, origin, origin, points);
  }, 250);
  debug('visual.manhba.replay', { kind: 'skill' });
  return true;
}
