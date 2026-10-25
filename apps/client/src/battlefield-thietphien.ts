import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { VisualActor } from './visual-actors.js';
import { DEFAULT_WINDUP, IGNITE_JUMP, SKILL_RADIUS, THIETPHIEN_ID, THIETPHIEN_SKILL } from './visual-thietphien-timeline.js';

/** Snapshot field the marker reads (a subset of Enemy, so tests need no full GameState). */
export type ThietphienSnapshotEnemy = { burn?: { remaining: number; casterId: string } };

export type EmberState = 'start' | 'hold';

/**
 * Which enemies show Thiết Phiến's fire detonation. The server sends no event for it: her skill only ever
 * sets an enemy alight by detonating existing burn (combat.ts), so an enemy whose snapshot `burn` belongs to
 * an h00B caster either just ignited (`start`: no earlier h00B burn, or its remaining time jumped) or is
 * still burning (`hold`). Pure presentation; gameplay never reads this.
 */
export class ThietphienTracker {
  private lastRemaining = new Map<string, number>();
  private forced = new Map<string, number>();

  constructor(private now: () => number = () => performance.now() / 1000) {}

  /** `casterHeroId` = hero id of the unit named by `burn.casterId` (other heroes burn enemies too; only h00B counts). */
  ember(id: string, enemy: ThietphienSnapshotEnemy, casterHeroId: string | undefined): EmberState | undefined {
    const forced = (this.forced.get(id) ?? 0) > this.now();
    const remaining = casterHeroId === THIETPHIEN_ID ? enemy.burn?.remaining ?? 0 : 0;
    if (forced && remaining <= 0) {
      const first = !this.lastRemaining.has(id);
      this.lastRemaining.set(id, 1);
      return first ? 'start' : 'hold';
    }
    if (remaining <= 0) { this.lastRemaining.delete(id); return undefined; }
    const previous = this.lastRemaining.get(id);
    this.lastRemaining.set(id, remaining);
    return previous === undefined || remaining > previous + IGNITE_JUMP ? 'start' : 'hold';
  }

  force(ids: readonly string[], seconds: number): void {
    const until = this.now() + seconds;
    for (const id of ids) { this.forced.set(id, until); this.lastRemaining.delete(id); }
  }

  clear(): void { this.lastRemaining.clear(); this.forced.clear(); }
}

export type ThietphienReplayTarget = {
  showCast(event: GameEvent, at: Vector3): void;
  show(event: GameEvent, at: Vector3, origin?: Vector3, targets?: readonly Vector3[]): void;
};

export type ThietphienReplayKind = 'skill' | 'near';

/**
 * `?debug=1` only: client-only events on the first Thiết Phiến in view, so the skill can be reviewed without
 * waiting for the cooldown. `skill` (default): windup → ability aimed at the farthest enemy within 8.5 (the
 * circle case); `near`: aimed at an enemy within 4.5 (the cone case); both fall back to a point ahead of her
 * when the field is empty. `(x, z)` overrides the aim point. Every enemy inside the real area is listed.
 */
export function replayThietphien(actors: Map<string, VisualActor>, zone: number, effects: ThietphienReplayTarget,
  tracker: ThietphienTracker, focus?: (x: number, z: number) => void,
  options: { kind?: ThietphienReplayKind; point?: { x: number; z: number } } = {}): boolean {
  const entries = [...actors.entries()].filter(([, actor]) => actor.zone === zone && actor.hp > 0 && !actor.dying);
  const caster = entries.find(([, actor]) => actor.heroId === THIETPHIEN_ID);
  if (!caster) { debug('visual.thietphien.replay.skip', { reason: 'no-caster' }); return false; }
  const [sourceId, source] = caster;
  const origin = source.root.position.clone();
  focus?.(origin.x, origin.z);
  const enemies = entries.filter(([, actor]) => !actor.heroId)
    .map(([id, actor]) => ({ id, at: actor.root.position.clone(), distance: actor.root.position.subtract(origin).length() }))
    .sort((a, b) => a.distance - b.distance);
  const near = options.kind === 'near';
  const pick = near ? enemies.find(enemy => enemy.distance <= SKILL_RADIUS)
    : [...enemies].reverse().find(enemy => enemy.distance <= 8.5 && enemy.distance > SKILL_RADIUS);
  const aim = options.point ? new Vector3(options.point.x, 0, options.point.z)
    : pick?.at ?? new Vector3(origin.x, 0, origin.z + (near ? 3 : 7));
  const base = { source: sourceId, zone } as const;
  const dx = aim.x - origin.x, dz = aim.z - origin.z, length = Math.hypot(dx, dz) || 1;
  const direction = { x: dx / length, z: dz / length };
  effects.showCast({ ...base, id: -40, kind: 'cast', ability: 'cleave', skillId: THIETPHIEN_SKILL, x: aim.x, z: aim.z,
    direction, windup: DEFAULT_WINDUP } as GameEvent, aim);
  setTimeout(() => {
    const hit = enemies.filter(enemy => {
      if (length > SKILL_RADIUS) return Math.hypot(enemy.at.x - aim.x, enemy.at.z - aim.z) <= SKILL_RADIUS;
      const hx = enemy.at.x - origin.x, hz = enemy.at.z - origin.z, hl = Math.hypot(hx, hz);
      return hl <= SKILL_RADIUS && (hl < .1 || (direction.x * hx + direction.z * hz) / hl >= .25);
    });
    tracker.force(hit.map(enemy => enemy.id), 3);
    effects.show({ ...base, id: -41, kind: 'ability', ability: 'cleave', skillId: THIETPHIEN_SKILL,
      targets: hit.map(enemy => enemy.id), x: aim.x, z: aim.z } as GameEvent, aim, origin, hit.map(enemy => enemy.at));
  }, DEFAULT_WINDUP * 1000);
  debug('visual.thietphien.replay', { kind: near ? 'near' : 'skill', hits: enemies.length });
  return true;
}
