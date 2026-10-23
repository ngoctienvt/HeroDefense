import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { CHUCLONG as C } from '../../../content/chuclong-design.js';
import type { VisualChuclong } from './visual-chuclong.js';

const KINDS = ['ultimate', 'lobby', 'nosummer', 'hold'] as const;
const SOURCE = 'preview-chuclong';
const WINDUP = .25;

/**
 * `?debug=1` presentation-only preview of Chúc Long, advanced by the owner's clock; `clear` cancels every later event.
 * `ultimate` = cast → `skill-h01K` (5 frozen targets) → phaseDelay → `summer-h01K` (a different 4) with freeze/burn holds and
 * the time gift to two allies; `lobby` = both events in the same tick without a cast; `nosummer` = cast + night and no day
 * event (the caster "died": the watchdog must free the eye); `hold` = freeze and burn markers only.
 * No command reaches the server and nothing here decides a result.
 */
export class ChuclongReplay {
  private run?: { age: number; caster: Vector3; reduced: boolean; kind: string; night: boolean; day: boolean };

  constructor(private vfx: Pick<VisualChuclong, 'cast' | 'winter' | 'summer' | 'timeGift' | 'markWinter' | 'markBurn'>) {}

  start(kind: string, caster: Vector3, reduced: boolean): boolean {
    if (!(KINDS as readonly string[]).includes(kind)) return false;
    this.run = { age: 0, caster: caster.clone(), reduced, kind, night: kind === 'hold', day: kind === 'hold' };
    if (kind === 'ultimate' || kind === 'nosummer') this.vfx.cast(this.event('cast', 'skill'), caster, reduced, caster);
    return true;
  }

  private event(kind: GameEvent['kind'], prefix: string): GameEvent {
    return { id: -1111, kind, skillId: `${prefix}-${C.id}`, source: SOURCE, windup: WINDUP, x: this.run?.caster.x, z: this.run?.caster.z,
      zone: 0, ability: 'nova' };
  }

  /** Monsters scattered over the lane, near and far, left and right of the caster (all inside the zone radius). */
  private points(caster: Vector3): { winter: Vector3[]; summer: Vector3[]; allies: Vector3[] } {
    const at = (x: number, z: number): Vector3 => caster.add(new Vector3(x, 0, z));
    return { winter: [at(-5, -4), at(5, -6), at(9, 1), at(-9, 3), at(1, -10)], summer: [at(-5, -4), at(5, -6), at(2, 8), at(-8, -9)],
      allies: [at(-4, 3), at(4, 3), caster.clone()] };
  }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    const { caster, reduced, kind } = run;
    const { winter, summer, allies } = this.points(caster);
    const start = kind === 'ultimate' || kind === 'nosummer' ? WINDUP : 0;
    if (!run.night && run.age >= start) {
      run.night = true;
      this.vfx.winter(this.event('ability', 'skill'), caster, winter, reduced);
      for (const ally of allies) this.vfx.timeGift(this.event('ability', 'skill'), caster, ally, reduced);
      if (kind === 'lobby') this.fireDay(summer);
    }
    const age = run.age - start;
    if (age < 0) return;
    if (!run.day && kind === 'ultimate' && age >= C.phaseDelay) this.fireDay(summer);
    if (kind === 'nosummer') this.marks(age, winter, []);
    else this.marks(age, winter, run.day ? summer : []);
    if (age > C.phaseDelay + C.summerBurnSeconds + .6) this.clear();
  }

  private fireDay(summer: Vector3[]): void {
    const run = this.run;
    if (!run || run.day) return;
    run.day = true;
    this.vfx.summer(this.event('trait', 'summer'), run.caster, run.reduced, summer);
  }

  /** The snapshot loop of the live game: freeze for 2.5 s after the night, burn for 4 s after the day. */
  private marks(age: number, winter: Vector3[], summer: Vector3[]): void {
    const run = this.run;
    if (!run) return;
    winter.forEach((point, i) => {
      const left = C.winterFreezeSeconds - age;
      if (left > 0) this.vfx.markWinter(`${SOURCE}:w${i}`, point, left, run.reduced);
    });
    summer.forEach((point, i) => {
      const left = C.phaseDelay + C.summerBurnSeconds - age;
      if (left > 0) this.vfx.markBurn(`${SOURCE}:s${i}`, point, run.kind === 'hold' ? C.summerBurnSeconds - age : left, run.reduced);
    });
  }

  clear(): void { this.run = undefined; }
}
