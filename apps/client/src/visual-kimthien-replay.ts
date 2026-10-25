import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { KIMTHIEN as K } from '../../../content/kimthien-design.js';
import type { VisualKimthien } from './visual-kimthien.js';
import { DEFAULT_WINDUP } from './visual-kimthien-timeline.js';

export const KIMTHIEN_REPLAY_KINDS = ['skill', 'lobby', 'late', 'attack'] as const;
type ReplayKind = (typeof KIMTHIEN_REPLAY_KINDS)[number];

const REPLAY_ID = 'debug-bowl';

/**
 * `?debug=1` preview, client only, advanced by the module clock (clear cancels it). `skill`: the real sequence (cast at
 * the locked point → windup → ability, then the ground marker every frame with `remaining` counting 5 s down);
 * `lobby`: the ability alone, never confirmed by a ground effect (practice casts); `late`: ground markers only, as when a
 * client joins mid-zone (2.5 s left); `attack`: one basic contact ring.
 */
export class KimthienReplay {
  private run?: { age: number; at: Vector3; origin: Vector3; reduced: boolean; kind: ReplayKind; resolved: boolean };
  constructor(private vfx: Pick<VisualKimthien, 'cast' | 'ability' | 'markBowl'>) {}

  /** `at` = the locked point, `origin` = the caster. */
  start(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    if (!(KIMTHIEN_REPLAY_KINDS as readonly string[]).includes(kind)) return false;
    const replayKind = kind as ReplayKind;
    this.run = { age: 0, at: at.clone(), origin: origin.clone(), reduced, kind: replayKind, resolved: false };
    if (replayKind === 'skill') this.vfx.cast(this.event('skill', 'cast'), at, reduced);
    if (replayKind === 'lobby') this.resolve();
    if (replayKind === 'attack') {
      this.vfx.ability(this.event('trait', 'attack'), origin, at, reduced, { hasOrigin: true, targets: [at] });
      this.run = undefined;
    }
    return true;
  }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    if (run.kind === 'skill' && !run.resolved && run.age >= DEFAULT_WINDUP) this.resolve();
    if (run.kind === 'lobby') { if (run.age > 3) this.run = undefined; return; }
    const zoneAge = run.kind === 'late' ? run.age + K.zoneSeconds - 2.5 : run.age - DEFAULT_WINDUP;
    if (run.kind === 'skill' && !run.resolved) return;
    const remaining = K.zoneSeconds - zoneAge;
    if (remaining <= 0) { this.run = undefined; return; }
    this.vfx.markBowl(REPLAY_ID, run.at, remaining, run.reduced);
  }

  clear(): void { this.run = undefined; }

  private resolve(): void {
    const run = this.run;
    if (!run) return;
    run.resolved = true;
    this.vfx.ability({ ...this.event('skill', 'ability'), x: run.at.x, z: run.at.z, targets: [] },
      run.origin, run.at, run.reduced, { hasOrigin: true, targets: [] });
  }

  private event(prefix: string, kind: GameEvent['kind']): GameEvent {
    return { id: -1013, kind, skillId: `${prefix}-${K.id}`, windup: DEFAULT_WINDUP, source: 'debug-kimthien',
      x: this.run?.at.x, z: this.run?.at.z };
  }
}
