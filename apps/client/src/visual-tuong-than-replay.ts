import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { TUONG_THAN as T } from '../../../content/tuong-than-design.js';
import type { AbilityExtra } from './visual-kit-hero.js';
import type { VisualTuongThan } from './visual-tuong-than.js';

export const TUONG_THAN_REPLAY_KINDS = ['ultimate', 'lobby', 'hold', 'generals', 'hit'] as const;
const SOURCE = 'preview-tuongthan';
const WINDUP = .25;
/** Elapsed seconds the `hold` replay starts at: a reconnect in the middle of the sea. */
const HOLD_AGE = 2.5;

type Run = { age: number; caster: Vector3; reduced: boolean; kind: string; resolved: boolean; hits: number };

/**
 * `?debug=1` presentation-only preview of Tướng Thần, advanced by the owner's clock; `clear` cancels every later event.
 * `ultimate` = cast → ability (three monsters) → 8 s sea marker + four generals with strikes; `lobby` = ability with no
 * cast and no sea; `hold` = the sea and generals already mid-life (no summon ring, no crest); `generals` = summon + strikes
 * only; `hit` = a few general strikes. No command reaches the server and nothing here decides a result.
 */
export class TuongThanReplay {
  private run?: Run;

  constructor(private vfx: Pick<VisualTuongThan, 'cast' | 'ability' | 'markZone' | 'markGeneral' | 'generalHit'>) {}

  start(kind: string, caster: Vector3, reduced: boolean): boolean {
    if (!(TUONG_THAN_REPLAY_KINDS as readonly string[]).includes(kind)) return false;
    const resolved = kind === 'hold' || kind === 'hit' || kind === 'generals';
    this.run = { age: kind === 'hold' ? HOLD_AGE : 0, caster: caster.clone(), reduced, kind, resolved, hits: 0 };
    if (kind === 'ultimate') this.vfx.cast(this.event('cast', 'skill-h03Z'), caster, reduced, caster);
    if (kind === 'generals') this.summonAll(caster, reduced);
    return true;
  }

  private event(kind: GameEvent['kind'], skillId: string, extra: Partial<GameEvent> = {}): GameEvent {
    return { id: -1031, kind, skillId, source: SOURCE, windup: WINDUP, x: this.run?.caster.x, z: this.run?.caster.z, ...extra };
  }

  /** Three monsters inside R8.5: near, middle and far side. */
  private monsters(caster: Vector3): Vector3[] {
    return [caster.add(new Vector3(3.5, 0, -4)), caster.add(new Vector3(-5, 0, -2)), caster.add(new Vector3(1, 0, 6))];
  }

  private general(caster: Vector3, index: number): Vector3 {
    const angle = index * Math.PI / 2;
    return caster.add(new Vector3(Math.cos(angle) * 1.8, 0, Math.sin(angle) * 1.8));
  }

  private summonAll(caster: Vector3, reduced: boolean): void {
    for (let i = 0; i < T.generalCount; i++) {
      const at = this.general(caster, i);
      this.vfx.ability(this.event('trait', 'blood-general-h03Z', { target: `${SOURCE}-g${i}`, x: at.x, z: at.z }), caster, at, reduced,
        { targets: [], hasOrigin: true } satisfies AbilityExtra);
    }
  }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    const { caster, reduced, kind } = run;
    const monsters = this.monsters(caster);
    if (!run.resolved && run.age >= (kind === 'ultimate' ? WINDUP : 0)) {
      run.resolved = true;
      this.vfx.ability(this.event('ability', 'skill-h03Z', { ability: 'nova' }), caster, caster, reduced,
        { targets: monsters, hasOrigin: true, main: monsters[0] } satisfies AbilityExtra);
      if (kind !== 'lobby') this.summonAll(caster, reduced);
    }
    const age = run.age - (kind === 'ultimate' ? WINDUP : 0);
    if (age < 0) return;
    const seaLeft = T.seaSeconds - age;
    if (kind !== 'lobby' && kind !== 'generals' && kind !== 'hit' && seaLeft > 0)
      this.vfx.markZone(`${SOURCE}-sea`, caster, T.seaRadius, seaLeft, reduced);
    const generalLeft = T.generalSeconds - age;
    if (kind !== 'lobby' && kind !== 'hit' && generalLeft > 0)
      for (let i = 0; i < T.generalCount; i++) this.vfx.markGeneral(`${SOURCE}-g${i}`, this.general(caster, i), generalLeft, reduced);
    const strikes = Math.min(Math.floor(age / T.generalInterval) + 1, kind === 'hit' ? 5 : Math.floor(T.generalSeconds / T.generalInterval));
    if (kind !== 'lobby') for (; run.hits < strikes; run.hits++) {
      const at = monsters[run.hits % monsters.length];
      this.vfx.generalHit(this.event('attack', 'blood-general-hit-h03Z', { x: at.x, z: at.z }), at, reduced);
    }
    if (age > Math.max(T.seaSeconds, kind === 'hit' ? 5 * T.generalInterval : 0) + .6) this.clear();
  }

  clear(): void { this.run = undefined; }
}
