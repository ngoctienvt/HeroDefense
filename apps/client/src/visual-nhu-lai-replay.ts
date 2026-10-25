import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { NHU_LAI as N } from '../../../content/new-divine-design.js';
import type { VisualNhuLai } from './visual-nhu-lai.js';

const KINDS = ['skill', 'trait', 'shield'];
const ALLY_OFFSET = new Vector3(-2.2, 0, 1.2);

/** `?debug=1` presentation-only preview, advanced by the owner's clock; clear cancels every future event. */
export class NhuLaiReplay {
  private run?: { age: number; at: Vector3; reduced: boolean; kind: string; impact: boolean };
  constructor(private vfx: Pick<VisualNhuLai, 'cast' | 'ability' | 'mark' | 'markZone'>) {}

  start(kind: string, at: Vector3, reduced: boolean): boolean {
    if (!KINDS.includes(kind)) return false;
    this.run = { age: 0, at: at.clone(), reduced, kind, impact: false };
    if (kind === 'skill') this.vfx.cast(this.event('skill', 'cast'), at, reduced);
    if (kind === 'trait') this.vfx.ability(this.event('trait'), at, at.add(new Vector3(3, 0, 0)), reduced);
    return true;
  }

  private event(prefix: string, kind: GameEvent['kind'] = 'trait'): GameEvent {
    return { id: -1010, kind, skillId: `${prefix}-${N.id}`, windup: N.windup };
  }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    const { at, reduced, kind } = run;
    const age = run.age - (kind === 'skill' ? N.windup : 0);
    if (kind === 'skill' && age >= 0) {
      if (!run.impact) {
        this.vfx.ability(this.event('skill', 'ability'), at, at, reduced);
        const ally = at.add(ALLY_OFFSET);
        this.vfx.ability(this.event('shield'), at, ally, reduced);
        run.impact = true;
      }
      if (age < N.zoneSeconds) this.vfx.markZone('debug-five-finger', at, N.zoneSeconds - age, reduced);
    }
    // Shield: ally marker every frame while the (fake) 6 s shield lasts.
    if ((kind === 'shield' || (kind === 'skill' && age >= 0)) && age < N.shieldSeconds)
      this.vfx.mark('shield', 'debug-ally', at.add(ALLY_OFFSET), reduced);
    if (run.age > Math.max(N.windup + N.shieldSeconds, 1.5)) this.clear();
  }

  clear(): void { this.run = undefined; }
}
