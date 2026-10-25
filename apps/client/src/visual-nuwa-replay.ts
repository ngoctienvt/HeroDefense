import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { NUWA as N } from '../../../content/nuwa-design.js';
import type { VisualNuwa } from './visual-nuwa.js';
import { DEFAULT_WINDUP } from './visual-nuwa-timeline.js';

const KINDS = ['ultimate', 'lobby', 'hold', 'revive'] as const;
const SOURCE = 'preview-nuwa';

/**
 * `?debug=1` presentation-only preview of Nữ Oa (`__vfxReplay('h01C', kind?)`), advanced by the owner's clock; `clear` cancels
 * every later event. `ultimate` = cast → ability on five monsters around the caster → blessing on three allies and a 6 s
 * five-colour ward on them; `lobby` = the same resolve without a cast; `hold` = the ward only; `revive` = two allies standing
 * up beside her. No command reaches the server and nothing here decides a result.
 */
export class NuwaReplay {
  private run?: { age: number; caster: Vector3; reduced: boolean; kind: string; resolved: boolean };

  constructor(private vfx: Pick<VisualNuwa, 'cast' | 'impact' | 'blessing' | 'revive' | 'markWard'>) {}

  start(kind: string, caster: Vector3, reduced: boolean): boolean {
    if (!(KINDS as readonly string[]).includes(kind)) return false;
    this.run = { age: 0, caster: caster.clone(), reduced, kind, resolved: kind === 'hold' || kind === 'revive' };
    if (kind === 'ultimate') this.vfx.cast(this.event('cast'), caster, reduced, caster);
    if (kind === 'revive') this.vfx.revive(this.event('trait', 'revive'), this.allies(caster).slice(1), reduced);
    return true;
  }

  private event(kind: GameEvent['kind'], prefix = 'skill'): GameEvent {
    return { id: -1012, kind, skillId: `${prefix}-${N.id}`, source: SOURCE, windup: DEFAULT_WINDUP,
      x: this.run?.caster.x, z: this.run?.caster.z, ability: kind === 'ability' ? 'nova' : undefined };
  }

  /** Five monsters on the far side and flanks, spread so the outer ones land a beat later. */
  private monsters(caster: Vector3): Vector3[] {
    return [[5, -3], [8.5, 2], [4, 5.5], [12, -1], [8, -6.5]].map(([x, z]) => caster.add(new Vector3(x, 0, z)));
  }

  private allies(caster: Vector3): Vector3[] {
    return [caster.clone(), caster.add(new Vector3(-3.2, 0, 1.4)), caster.add(new Vector3(-1.5, 0, -3.4))];
  }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    const { caster, reduced, kind } = run;
    if (!run.resolved && run.age >= (kind === 'ultimate' ? DEFAULT_WINDUP : 0)) {
      run.resolved = true;
      this.vfx.impact(this.event('ability'), caster, this.monsters(caster), reduced);
      this.vfx.blessing(this.event('trait', 'blessing'), this.allies(caster), reduced);
    }
    const age = run.age - (kind === 'ultimate' ? DEFAULT_WINDUP : 0);
    if (age >= 0 && kind !== 'revive' && age < N.blessingSeconds)
      this.allies(caster).forEach((at, index) => this.vfx.markWard(`${SOURCE}-ward-${index}`, at, N.blessingSeconds - age, reduced));
    if (age > (kind === 'revive' ? 1.2 : N.blessingSeconds) + .6) this.clear();
  }

  clear(): void { this.run = undefined; }
}
