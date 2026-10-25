import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { PHUONG_HOANG as P } from '../../../content/phuong-hoang-design.js';
import type { VisualPhuongHoang } from './visual-phuong-hoang.js';

// Debug-only mirror of combat.ts WINDUP_SECONDS. Runtime always consumes event.windup.
const REPLAY_WINDUP = .25;
type Run = { age: number; caster: Vector3; point: Vector3; reduced: boolean; struck: boolean; kind: string; actorId?: string };

/** Local events/snapshots only; never dispatch commands or alter combat results. */
export class PhoenixReplay {
  private run?: Run;
  constructor(private vfx: Pick<VisualPhuongHoang, 'cast' | 'ability' | 'markCarpet'>) {}

  start(kind: string, caster: Vector3, point: Vector3, reduced: boolean, actorId?: string): boolean {
    if (!['ultimate', 'lobby', 'ground', 'rebirth'].includes(kind) || (kind === 'rebirth' && !actorId)) return false;
    this.run = { age: kind === 'ground' ? REPLAY_WINDUP + 1.5 : kind === 'lobby' ? REPLAY_WINDUP : 0,
      caster: caster.clone(), point: point.clone(), reduced, struck: kind === 'ground', kind, actorId };
    if (kind === 'ultimate') this.vfx.cast(this.event('cast'), point, reduced);
    return true;
  }

  /** Presentation override only; every server snapshot remains intact. Follows the visible actor. */
  egg(actorId: string, at: Vector3): boolean {
    const run = this.run;
    if (run?.kind !== 'rebirth' || run.actorId !== actorId || run.age >= P.eggSeconds) return false;
    run.caster.copyFrom(at); run.point.copyFrom(at);
    return true;
  }

  private event(kind: GameEvent['kind'], skillId: string = `skill-${P.id}`): GameEvent {
    const run = this.run!;
    const dx = run.point.x - run.caster.x, dz = run.point.z - run.caster.z, len = Math.hypot(dx, dz);
    return { id: -4101, kind, source: run.kind === 'rebirth' ? run.actorId : 'debug-phoenix', skillId,
      windup: run.kind === 'rebirth' ? undefined : REPLAY_WINDUP,
      x: run.point.x, z: run.point.z, direction: len > .001 ? { x: dx / len, z: dz / len } : undefined };
  }

  /** Debug-only stand-ins for the monsters of a lane (the replay has no server); never used by the real game path. */
  private lane(run: Run): Vector3[] {
    const dx = run.point.x - run.caster.x, dz = run.point.z - run.caster.z, len = Math.hypot(dx, dz);
    const dir = len > .001 ? { x: dx / len, z: dz / len } : { x: 1, z: 0 };
    return [6, 10, 13, 17, 21, 25, 29].map((along, i) => new Vector3(
      run.caster.x + dir.x * along - dir.z * (i % 2 ? 2.2 : -2.2), 0, run.caster.z + dir.z * along + dir.x * (i % 2 ? 2.2 : -2.2)));
  }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    if (run.kind === 'rebirth') {
      if (!run.struck && run.age >= P.eggSeconds) {
        run.struck = true;
        this.vfx.ability(this.event('trait', `phoenix-rebirth-${P.id}`), run.caster, run.caster, run.reduced);
      }
      if (run.age >= P.eggSeconds + .65) this.clear();
      return;
    }
    const after = run.age - REPLAY_WINDUP;
    if (after < 0) return;
    if (!run.struck) {
      run.struck = true;
      this.vfx.ability(this.event('ability'), run.caster, run.point, run.reduced,
        { targets: this.lane(run), hasOrigin: true });
    }
    const remaining = P.carpetSeconds - after;
    if (remaining <= 0 || (run.kind === 'lobby' && after > 1)) { this.clear(); return; }
    if (run.kind !== 'lobby') this.vfx.markCarpet('debug-phoenix-carpet', run.point, P.radius,
      remaining, Math.max(0, P.rainSeconds - after), run.reduced);
  }

  clear(): void { this.run = undefined; }
}
