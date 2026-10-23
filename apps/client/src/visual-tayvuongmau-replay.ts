import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { TAYVUONGMAU as T } from '../../../content/tayvuongmau-design.js';
import type { VisualTayvuongmau } from './visual-tayvuongmau.js';
import { DEFAULT_WINDUP } from './visual-tayvuongmau-timeline.js';

export const TAYVUONGMAU_REPLAY_KINDS = ['skill', 'lobby', 'attack', 'peach'] as const;
type ReplayKind = (typeof TAYVUONGMAU_REPLAY_KINDS)[number];

/** Peach buff length shown by the `peach` replay (matches the design). */
const BLESSING_SECONDS = T.peachSeconds;

/**
 * `?debug=1` preview, client only, advanced by the module clock (clear cancels it). `skill`: the real event sequence
 * (cast at the locked point → windup → ability with the caster as origin and four monsters); `lobby`: the ability
 * without cast or origin (practice casts, reconnect); `attack`: one basic volley of five pins; `peach`: three peaches
 * to three allies beside the caster plus the 5 s blessing markers (fed every frame like the snapshot loop).
 */
export class TayvuongmauReplay {
  private run?: { age: number; at: Vector3; origin: Vector3; reduced: boolean; kind: ReplayKind; resolved: boolean };
  constructor(private vfx: Pick<VisualTayvuongmau, 'cast' | 'ability' | 'mark'>) {}

  /** `at` = the locked point (`peach`: ignored), `origin` = the caster. */
  start(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    if (!(TAYVUONGMAU_REPLAY_KINDS as readonly string[]).includes(kind)) return false;
    const replayKind = kind as ReplayKind;
    this.run = { age: 0, at: at.clone(), origin: origin.clone(), reduced, kind: replayKind, resolved: false };
    if (replayKind === 'skill') this.vfx.cast(this.event('skill', 'cast'), at, reduced);
    if (replayKind === 'attack') {
      const dir = this.direction(origin, at);
      const targets = [0, 1, 2, 3, 4].map(i => origin.add(new Vector3(dir.x * (4 + i) - dir.z * (i - 2) * 1.4, 0, dir.z * (4 + i) + dir.x * (i - 2) * 1.4)));
      this.vfx.ability({ ...this.event('trait', 'attack'), direction: dir }, origin, targets[0], reduced, { hasOrigin: true, targets });
      this.run = undefined;
    }
    if (replayKind === 'peach') {
      this.allies(origin).forEach((ally, i) => this.vfx.ability({ ...this.event('peach', 'ability'), target: `debug-ally-${i}` },
        origin, ally, reduced, { hasOrigin: true, targets: [ally] }));
    }
    return true;
  }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    if (run.kind === 'peach') {
      this.allies(run.origin).forEach((ally, i) => this.vfx.mark('peach', `debug-ally-${i}`, ally, run.reduced));
      if (run.age >= BLESSING_SECONDS) this.run = undefined;
      return;
    }
    if (run.resolved || run.age < (run.kind === 'skill' ? DEFAULT_WINDUP : 0)) return;
    run.resolved = true;
    const targets = [[-3, 1], [2.5, -2], [0, 3.5], [-1.5, -3.5]].map(([x, z]) => run.at.add(new Vector3(x, 0, z)));
    this.vfx.ability({ ...this.event('skill', 'ability'), x: run.at.x, z: run.at.z, targets: targets.map((_, i) => `debug-${i}`) },
      run.origin, run.at, run.reduced, { hasOrigin: run.kind === 'skill', targets });
    this.run = undefined;
  }

  clear(): void { this.run = undefined; }

  private allies(origin: Vector3): Vector3[] {
    return [[-2.6, .6], [2.6, .6], [0, 2.8]].map(([x, z]) => origin.add(new Vector3(x, 0, z)));
  }

  private direction(origin: Vector3, at: Vector3): { x: number; z: number } {
    const dx = at.x - origin.x, dz = at.z - origin.z, length = Math.hypot(dx, dz);
    return length > 1e-3 ? { x: dx / length, z: dz / length } : { x: 0, z: -1 };
  }

  private event(prefix: string, kind: GameEvent['kind']): GameEvent {
    return { id: -1010, kind, skillId: `${prefix}-${T.id}`, windup: DEFAULT_WINDUP, source: 'debug-tayvuongmau',
      x: this.run?.at.x, z: this.run?.at.z };
  }
}
