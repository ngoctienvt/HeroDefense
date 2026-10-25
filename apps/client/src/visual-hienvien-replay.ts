import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { HIENVIEN as H } from '../../../content/hienvien-design.js';
import type { VisualHienvien } from './visual-hienvien.js';
import { DEFAULT_WINDUP } from './visual-hienvien-timeline.js';

export const HIENVIEN_REPLAY_KINDS = ['skill', 'attack', 'blessing', 'lobby'] as const;
export type HienvienReplayKind = (typeof HIENVIEN_REPLAY_KINDS)[number];
const ZONE_ID = 'debug-xuanyuan', ALLY_ID = 'debug-hienvien-ally';

/**
 * `?debug=1` preview, client only, advanced by the module clock (clear cancels it). `skill`: the real event
 * sequence (cast → impact → 5 s zone snapshot → 15 rain pulses → blessing ring snapshot); `lobby`: impact
 * without cast or zone (practice casts); `attack`: one five-sword fan; `blessing`: the 6 s ally marks.
 */
export class HienvienReplay {
  private run?: { age: number; at: Vector3; origin: Vector3; reduced: boolean; kind: HienvienReplayKind; impact: boolean; rains: number };
  constructor(private vfx: Pick<VisualHienvien, 'cast' | 'ability' | 'mark' | 'markZone'>) {}

  /** `at` = locked point (or the caster for attack/blessing), `origin` = the caster the blessing ring follows. */
  start(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    if (!(HIENVIEN_REPLAY_KINDS as readonly string[]).includes(kind)) return false;
    const replayKind = kind as HienvienReplayKind;
    this.run = { age: 0, at: at.clone(), origin: origin.clone(), reduced, kind: replayKind, impact: false, rains: 0 };
    if (replayKind === 'skill') this.vfx.cast(this.event('skill', 'cast'), at, reduced);
    if (replayKind === 'attack') {
      const targets = [at.add(new Vector3(-4, 0, 0)), at.add(new Vector3(-7, 0, .4))];
      this.vfx.ability({ ...this.event('trait', 'attack'), direction: { x: -1, z: 0 } }, at, targets[0], reduced,
        { hasOrigin: true, targets });
      this.run = undefined;
    }
    return true;
  }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    const { at, origin, reduced, kind } = run;
    const age = kind === 'skill' ? run.age - DEFAULT_WINDUP : run.age;
    if ((kind === 'skill' || kind === 'lobby') && age >= 0 && !run.impact) {
      run.impact = true;
      this.vfx.ability(this.event('skill', 'ability'), origin, at, reduced);
      this.vfx.ability(this.event('imperial-blessing', 'trait'), origin, at, reduced, { hasOrigin: true, targets: [origin] });
    }
    if (kind === 'skill' && age >= 0) {
      if (age < H.rainSeconds) this.vfx.markZone(ZONE_ID, at, H.rainSeconds - age, reduced);
      while (run.rains < Math.min(H.rainSwords, Math.floor(age / (H.rainSeconds / H.rainSwords)))) {
        const n = run.rains++, angle = n * 2.399, r = 1.5 + (n * 3.7) % (H.giantRadius - 2);
        this.vfx.ability({ ...this.event('sword-rain', 'trait'), strikeIndex: n }, at,
          at.add(new Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r)), reduced);
      }
    }
    if ((kind === 'blessing' || (kind !== 'lobby' && age >= 0)) && age < H.blessingSeconds)
      this.vfx.mark('blessing', ALLY_ID, origin, reduced);
    if (run.age > DEFAULT_WINDUP + Math.max(H.rainSeconds, H.blessingSeconds) + .2) this.clear();
  }

  clear(): void { this.run = undefined; }

  private event(prefix: string, kind: GameEvent['kind']): GameEvent {
    return { id: -1015, kind, skillId: `${prefix}-${H.id}`, windup: DEFAULT_WINDUP, source: 'debug-hienvien' };
  }
}
