import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { HANGNGA as H } from '../../../content/hangnga-design.js';
import type { VisualHangnga } from './visual-hangnga.js';
import { DEFAULT_WINDUP } from './visual-hangnga-timeline.js';

export const HANGNGA_REPLAY_KINDS = ['skill', 'lobby', 'attack', 'shield', 'freeze'] as const;
type ReplayKind = (typeof HANGNGA_REPLAY_KINDS)[number];

/** How long the debug shield stays in the fake snapshot before the unwind (the real one has no timer). */
const SHIELD_SECONDS = 4;
const SOURCE = 'debug-hangnga';

/**
 * `?debug=1` preview, client only, advanced by the module clock (clear cancels it). `skill`: the real event sequence
 * (cast → windup → ability with the caster plus two allies → the independent freeze on four monsters) and the shield
 * marker fed every frame for 4 s, then dropped; `lobby`: the ability without a cast; `attack`: one basic silk;
 * `shield`: the wrap alone (ability without cast + 4 s of markers); `freeze`: the zone-wide drop on six monsters.
 */
export class HangngaReplay {
  private run?: { age: number; at: Vector3; origin: Vector3; reduced: boolean; kind: ReplayKind; resolved: boolean };
  constructor(private vfx: Pick<VisualHangnga, 'cast' | 'ability' | 'mark'>) {}

  /** `at` = a point on the field (monsters stand around it), `origin` = the caster. */
  start(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    if (!(HANGNGA_REPLAY_KINDS as readonly string[]).includes(kind)) return false;
    const replayKind = kind as ReplayKind;
    this.run = { age: 0, at: at.clone(), origin: origin.clone(), reduced, kind: replayKind, resolved: false };
    if (replayKind === 'skill') this.vfx.cast(this.event('skill', 'cast'), origin, reduced);
    if (replayKind === 'attack') {
      this.vfx.ability(this.event('trait', 'attack'), origin, at, reduced, { hasOrigin: true, targets: [at] });
      this.run = undefined;
    }
    if (replayKind === 'freeze') {
      this.freeze(at, reduced);
      this.run = undefined;
    }
    return true;
  }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    const shielded = run.kind === 'skill' || run.kind === 'shield';
    if (!run.resolved && run.age >= (run.kind === 'skill' ? DEFAULT_WINDUP : 0)) {
      run.resolved = true;
      const allies = this.allies(run.origin);
      this.vfx.ability({ ...this.event('skill', 'ability'), targets: allies.map((_, i) => this.id(i)) },
        run.origin, run.origin, run.reduced, { hasOrigin: run.kind === 'skill', targets: allies });
      if (run.kind === 'skill') this.freeze(run.at, run.reduced);
    }
    // The fake snapshot shows a shield every frame for SHIELD_SECONDS after the resolve, then stops (the wrap unwinds).
    if (shielded && run.resolved && run.age < SHIELD_SECONDS)
      this.allies(run.origin).forEach((ally, i) => this.vfx.mark('shield', this.id(i), ally, run.reduced));
    if (run.resolved && run.age >= (shielded ? SHIELD_SECONDS + .5 : 0)) this.run = undefined;
  }

  clear(): void { this.run = undefined; }

  private freeze(at: Vector3, reduced: boolean): void {
    const targets = [[-3, 1], [2.5, -2], [0, 3.5], [-1.5, -3.5], [4, 2], [-4.5, -1]].slice(0, this.run?.kind === 'freeze' ? 6 : 4)
      .map(([x, z]) => at.add(new Vector3(x, 0, z)));
    this.vfx.ability({ ...this.event('freeze', 'trait'), targets: targets.map((_, i) => `debug-monster-${i}`) },
      at, at, reduced, { hasOrigin: false, targets });
  }

  /** The caster herself (index 0) and two allies beside her, all inside the heal radius. */
  private allies(origin: Vector3): Vector3[] {
    return [[0, 0], [-3.4, .8], [5.2, 1.4]].map(([x, z]) => origin.add(new Vector3(x, 0, z)));
  }

  private id(index: number): string { return index === 0 ? SOURCE : `debug-ally-${index}`; }

  private event(prefix: string, kind: GameEvent['kind']): GameEvent {
    return { id: -1018, kind, skillId: `${prefix}-${H.id}`, windup: DEFAULT_WINDUP, source: SOURCE,
      x: this.run?.origin.x, z: this.run?.origin.z };
  }
}
