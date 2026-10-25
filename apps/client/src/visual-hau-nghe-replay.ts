import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { HAUNGHE as H } from '../../../content/hau-nghe-design.js';
import type { VisualHauNghe } from './visual-hau-nghe.js';
import { DEFAULT_WINDUP } from './visual-hau-nghe-timeline.js';

export const HAUNGHE_REPLAY_KINDS = ['skill', 'lobby', 'attack'] as const;
type ReplayKind = (typeof HAUNGHE_REPLAY_KINDS)[number];

/**
 * `?debug=1` preview, client only, advanced by the module clock (clear cancels it). `skill`: the real event
 * sequence (cast → windup → ability with the caster as origin); `lobby`: the ability without cast or origin
 * (practice casts, reconnect); `attack`: one basic arrow along the pierce line with three hit targets.
 */
export class HauNgheReplay {
  private run?: { age: number; at: Vector3; origin: Vector3; reduced: boolean; kind: ReplayKind; resolved: boolean };
  constructor(private vfx: Pick<VisualHauNghe, 'cast' | 'ability'>) {}

  /** `at` = the locked point, `origin` = the caster. */
  start(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    if (!(HAUNGHE_REPLAY_KINDS as readonly string[]).includes(kind)) return false;
    const replayKind = kind as ReplayKind;
    this.run = { age: 0, at: at.clone(), origin: origin.clone(), reduced, kind: replayKind, resolved: false };
    const direction = this.direction(origin, at);
    if (replayKind === 'skill') this.vfx.cast({ ...this.event('skill', 'cast'), direction }, origin, reduced, origin);
    if (replayKind === 'attack') {
      const targets = [0, 1, 2].map(i => origin.add(new Vector3(direction.x * (4 + i * 3), 0, direction.z * (4 + i * 3))));
      this.vfx.ability({ ...this.event('trait', 'attack'), direction, isCrit: true }, origin, targets[0], reduced,
        { hasOrigin: true, targets });
      this.run = undefined;
    }
    return true;
  }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    if (run.resolved || run.age < (run.kind === 'skill' ? DEFAULT_WINDUP : 0)) return;
    run.resolved = true;
    const hasOrigin = run.kind === 'skill';
    this.vfx.ability({ ...this.event('skill', 'ability'), x: run.at.x, z: run.at.z, targets: [] },
      run.origin, run.at, run.reduced, { hasOrigin, targets: [] });
    this.run = undefined;
  }

  clear(): void { this.run = undefined; }

  private direction(origin: Vector3, at: Vector3): { x: number; z: number } {
    const dx = at.x - origin.x, dz = at.z - origin.z, length = Math.hypot(dx, dz);
    return length > 1e-3 ? { x: dx / length, z: dz / length } : { x: 0, z: -1 };
  }

  private event(prefix: string, kind: GameEvent['kind']): GameEvent {
    return { id: -1017, kind, skillId: `${prefix}-${H.id}`, windup: DEFAULT_WINDUP, source: 'debug-haunghe',
      x: this.run?.at.x, z: this.run?.at.z };
  }
}
