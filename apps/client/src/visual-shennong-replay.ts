import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { SHENNONG } from '../../../content/shennong-design.js';
import type { VisualShennong } from './visual-shennong.js';
import { DEFAULT_WINDUP } from './visual-shennong-timeline.js';

export const SHENNONG_REPLAY_KINDS = ['ultimate', 'lobby', 'hold'] as const;
type Kind = (typeof SHENNONG_REPLAY_KINDS)[number];
const GROVE_ID = 'debug-shennong-grove', SOURCE = 'debug-shennong';

/**
 * `?debug=1` preview, client only, advanced by the module clock (`clear` cancels it). `ultimate`: cast → impact → the
 * 5.5 s grove snapshot with three ghost trees (the real ones are server summons), weakness marks on three monsters and a
 * life stream to two allies; `lobby`: impact only (practice casts spawn no grove); `hold`: joins at the middle of the hold.
 */
export class ShennongReplay {
  private run?: { age: number; at: Vector3; caster: Vector3; reduced: boolean; kind: Kind; impact: boolean };
  constructor(private vfx: Pick<VisualShennong, 'cast' | 'ability' | 'markGrove' | 'markTree' | 'markWeakness' | 'markHeal'>) {}

  start(kind: string, caster: Vector3, at: Vector3, reduced: boolean): boolean {
    if (!(SHENNONG_REPLAY_KINDS as readonly string[]).includes(kind) || ![caster.x, caster.z, at.x, at.z].every(Number.isFinite)) return false;
    const replayKind = kind as Kind;
    this.run = { age: replayKind === 'hold' ? DEFAULT_WINDUP + SHENNONG.zoneSeconds * .45 : 0, at: at.clone(),
      caster: caster.clone(), reduced, kind: replayKind, impact: replayKind === 'hold' };
    if (replayKind === 'ultimate') this.vfx.cast(this.event('cast'), at, reduced);
    return true;
  }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    const { at, caster, reduced, kind } = run;
    const age = kind === 'lobby' ? run.age : run.age - DEFAULT_WINDUP;
    if (age >= 0 && !run.impact) {
      run.impact = true;
      this.vfx.ability(this.event('ability'), caster, at, reduced, { hasOrigin: true, targets: this.monsters(at) });
    }
    if (kind !== 'lobby' && age >= 0 && age < SHENNONG.zoneSeconds) {
      const remaining = SHENNONG.zoneSeconds - age;
      this.vfx.markGrove(GROVE_ID, at, SHENNONG.zoneRadius, remaining, reduced);
      for (let i = 0; i < SHENNONG.trees; i++) {
        const angle = i * Math.PI * 2 / SHENNONG.trees;
        this.vfx.markTree(`debug-shennong-tree-${i}`, at.add(new Vector3(Math.cos(angle) * 4.2, 0, Math.sin(angle) * 4.2)), remaining, reduced, true);
      }
      this.monsters(at).forEach((monster, i) => this.vfx.markWeakness(`debug-shennong-weak-${i}`, monster, remaining, reduced));
      this.vfx.markHeal('debug-shennong-heal-0', at, caster, remaining, reduced);
      this.vfx.markHeal('debug-shennong-heal-1', at, caster.add(new Vector3(-3, 0, 2.5)), remaining, reduced);
    }
    if (run.age > DEFAULT_WINDUP + SHENNONG.zoneSeconds + .8) this.clear();
  }

  clear(): void { this.run = undefined; }

  private monsters(at: Vector3): Vector3[] {
    return [at.add(new Vector3(1.4, 0, 1.2)), at.add(new Vector3(-1.2, 0, -.6)), at.add(new Vector3(-0.4, 0, 2.6))];
  }

  private event(kind: GameEvent['kind']): GameEvent {
    return { id: -1016, kind, skillId: `skill-${SHENNONG.id}`, windup: DEFAULT_WINDUP, source: SOURCE, ability: 'nova' };
  }
}
