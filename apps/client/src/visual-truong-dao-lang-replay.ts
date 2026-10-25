import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { TRUONG_DAO_LANG as B } from '../../../content/truong-dao-lang-design.js';
import type { VisualTruongDaoLang } from './visual-truong-dao-lang.js';

/** Presentation-only preview, advanced by the owner's clock; clear cancels all future events. */
export class TruongReplay {
  private run?: { age: number; at: Vector3; reduced: boolean; impact: boolean; bolts: number; kind: string };
  constructor(private vfx: Pick<VisualTruongDaoLang, 'cast' | 'ability' | 'mark' | 'markZone'>) {}

  start(kind: string, at: Vector3, reduced: boolean): boolean {
    if (!['skill', 'attack', 'blessing'].includes(kind)) return false;
    this.run = { age: 0, at: at.clone(), reduced, impact: false, bolts: 0, kind };
    if (kind === 'skill') this.vfx.cast(this.event('skill', 'cast'), at, reduced);
    if (kind === 'attack') this.vfx.ability(this.event('trait'), at,
      at.add(new Vector3(3, 0, 0)), reduced,
      { hasOrigin: true, targets: [at.add(new Vector3(3, 0, 0)), at.add(new Vector3(5, 0, 2))] });
    return true;
  }

  private event(prefix: string, kind: GameEvent['kind'] = 'trait'): GameEvent {
    return { id: -4040, kind, skillId: `${prefix}-h040`, windup: B.windup };
  }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    const { at, reduced, kind } = run;
    const age = run.age - B.windup;
    if (kind === 'skill' && age >= 0) {
      if (!run.impact) {
        this.vfx.ability(this.event('skill', 'ability'), at, at, reduced);
        run.impact = true;
      }
      if (age < B.freezeSeconds) this.vfx.markZone('debug-beidou', at, B.freezeSeconds - age, reduced);
      while (run.bolts < Math.min(B.bolts, Math.floor(age / .1))) {
        const n = run.bolts++, angle = n * 2.399;
        this.vfx.ability({ ...this.event('bolt'), strikeIndex: n }, at,
          at.add(new Vector3(Math.cos(angle) * 3, 0, Math.sin(angle) * 3)), reduced);
      }
    }
    if ((kind === 'blessing' || (kind === 'skill' && age >= 0)) && age < B.buffSeconds)
      this.vfx.mark('blessing', 'debug-beidou-ally', at, reduced);
    if (run.age > B.windup + B.buffSeconds) this.clear();
  }

  clear(): void { this.run = undefined; }
}
