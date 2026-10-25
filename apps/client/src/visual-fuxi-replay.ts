import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { FUXI } from '../../../content/fuxi-design.js';
import type { VisualFuxi } from './visual-fuxi.js';
import { DEFAULT_WINDUP } from './visual-fuxi-timeline.js';

const KINDS = ['ultimate', 'lobby', 'hold'] as const;
const SOURCE = 'preview-fuxi';
/** Six monsters inside R9.5 of the locked point; consecutive ones are linked like the server's `soulLink.group`. */
const OFFSETS: readonly [number, number][] = [[1.5, 1], [-3, 2], [1, -4], [-2.5, -3], [4.5, -1.5], [5.5, 3.5]];
type Run = { age: number; caster: Vector3; point: Vector3; reduced: boolean; resolved: boolean; kind: typeof KINDS[number] };

/** `?debug=1` replay (`__vfxReplay('h01D', kind?)`): ultimate (cast → resolve → 6 s hold), lobby (no cast), hold (mid-life). Presentation only. */
export class FuxiReplay {
  private run?: Run;

  constructor(private vfx: Pick<VisualFuxi, 'cast' | 'impact' | 'markZone' | 'markLink'>) {}

  start(kind: string, caster: Vector3, point: Vector3, reduced: boolean): boolean {
    if (!(KINDS as readonly string[]).includes(kind) || ![caster.x, caster.z, point.x, point.z].every(Number.isFinite)) return false;
    const mode = kind as Run['kind'];
    this.run = { age: mode === 'hold' ? DEFAULT_WINDUP + FUXI.duration * .45 : 0, caster: caster.clone(), point: point.clone(),
      reduced, resolved: mode === 'hold', kind: mode };
    if (mode === 'ultimate') this.vfx.cast(this.event('cast'), point, reduced);
    return true;
  }

  private event(kind: GameEvent['kind']): GameEvent {
    return { id: -1041, kind, skillId: `skill-${FUXI.id}`, source: SOURCE, windup: DEFAULT_WINDUP, ability: 'nova',
      x: this.run?.point.x, z: this.run?.point.z, zone: 0 };
  }

  private targets(point: Vector3): Vector3[] { return OFFSETS.map(([x, z]) => point.add(new Vector3(x, 0, z))); }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    const windup = run.kind === 'ultimate' ? DEFAULT_WINDUP : 0;
    if (!run.resolved && run.age >= windup) {
      run.resolved = true;
      if (run.kind === 'ultimate' || run.kind === 'lobby') this.vfx.impact(this.event('ability'), run.point, run.reduced, this.targets(run.point));
    }
    const age = run.age - windup;
    if (age < 0) return;
    if (age < FUXI.duration) {
      const remaining = FUXI.duration - age, points = this.targets(run.point);
      this.vfx.markZone(SOURCE, run.point, FUXI.radius, remaining, run.reduced);
      for (let i = 1; i < points.length; i++) this.vfx.markLink(`${SOURCE}:${i}`, points[i - 1], points[i], remaining, run.reduced);
    } else if (age > FUXI.duration + .6) this.clear();
  }

  clear(): void { this.run = undefined; }
}
