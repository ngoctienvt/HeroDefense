import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { DE_TUAN as D } from '../../../content/new-divine-design.js';
import type { AbilityExtra } from './visual-kit-hero.js';
import type { VisualDeTuan } from './visual-de-tuan.js';

const KINDS = ['ultimate', 'lobby', 'hold', 'strike'] as const;
const SOURCE = 'preview-detuan';
/** Berserk attacks every ~0.4 s (interval .8, attack speed ×2); the preview alternates the two server events. */
const HIT_INTERVAL = .4;

/**
 * `?debug=1` presentation-only preview of Đế Tuấn, advanced by the owner's clock; `clear` cancels every later event.
 * `ultimate` = cast → ability (main target + two splash) → 6.5 s wreath with crow bursts and empowered hits;
 * `lobby` = ability without a cast; `hold` = the transformed state only; `strike` = a few transformed strikes.
 * No command reaches the server and nothing here decides a result.
 */
export class DeTuanReplay {
  private run?: { age: number; caster: Vector3; reduced: boolean; kind: string; resolved: boolean; hits: number };

  constructor(private vfx: Pick<VisualDeTuan, 'cast' | 'ability' | 'markForm'>) {}

  start(kind: string, caster: Vector3, reduced: boolean): boolean {
    if (!(KINDS as readonly string[]).includes(kind)) return false;
    this.run = { age: 0, caster: caster.clone(), reduced, kind, resolved: kind === 'hold' || kind === 'strike', hits: 0 };
    if (kind === 'ultimate') this.vfx.cast(this.event('cast', 'skill'), caster, reduced, caster);
    return true;
  }

  private event(kind: GameEvent['kind'], prefix: string, extra: Partial<GameEvent> = {}): GameEvent {
    return { id: -1011, kind, skillId: `${prefix}-${D.id}`, source: SOURCE, windup: D.windup, x: this.run?.caster.x,
      z: this.run?.caster.z, ...extra };
  }

  /** Main target on the far side (screen-up), splash on both flanks, all inside R8.5. */
  private points(caster: Vector3): { main: Vector3; targets: Vector3[] } {
    const main = caster.add(new Vector3(3.5, 0, -4.5));
    return { main, targets: [caster.add(new Vector3(-5, 0, -2)), main.clone(), caster.add(new Vector3(1.5, 0, -7))] };
  }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    const { caster, reduced, kind } = run;
    const { main, targets } = this.points(caster);
    if (!run.resolved && run.age >= (kind === 'ultimate' ? D.windup : 0)) {
      run.resolved = true;
      this.vfx.ability(this.event('ability', 'skill', { ability: 'nova' }), caster, caster, reduced,
        { targets, hasOrigin: true, main } satisfies AbilityExtra);
    }
    const age = run.age - (kind === 'ultimate' ? D.windup : 0);
    if (age < 0) return;
    if (kind !== 'strike' && age < D.berserkSeconds) this.vfx.markForm(`${SOURCE}-form`, caster, D.berserkSeconds - age, reduced);
    const wanted = Math.min(Math.floor(age / HIT_INTERVAL) + 1, kind === 'strike' ? 6 : Math.floor(D.berserkSeconds / HIT_INTERVAL));
    for (; run.hits < wanted; run.hits++) {
      const at = run.hits % 2 ? targets[0] : main;
      const extra: AbilityExtra = { targets: [at], hasOrigin: true };
      this.vfx.ability(this.event('trait', 'crow-burst', { x: at.x, z: at.z }), caster, at, reduced, extra);
      this.vfx.ability(this.event('trait', 'trait', { x: at.x, z: at.z, isCrit: true }), caster, at, reduced, extra);
    }
    if (age > (kind === 'strike' ? 6 * HIT_INTERVAL : D.berserkSeconds) + .6) this.clear();
  }

  clear(): void { this.run = undefined; }
}
