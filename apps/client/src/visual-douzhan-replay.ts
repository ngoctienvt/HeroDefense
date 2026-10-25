import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { DOUZHAN as D } from '../../../content/douzhan-design.js';
import type { VisualDouzhan } from './visual-douzhan.js';
import { DEFAULT_WINDUP } from './visual-douzhan-timeline.js';

export const DOUZHAN_REPLAY_KINDS = ['skill', 'lobby', 'clone'] as const;
type ReplayKind = (typeof DOUZHAN_REPLAY_KINDS)[number];
/** Seconds the fake snapshot keeps the three clones before they vanish (shows arrival, hold and exit). */
const CLONE_SHOW = 3;
const CLONE_RING = 1.8;

/**
 * `?debug=1` preview, client only, advanced by the module clock (clear cancels it). `skill`: the real sequence
 * (cast → windup → ability along the direction to the point → summon → three clones in the snapshot for a few seconds);
 * `lobby`: the ability and summon without a cast; `clone`: three clone strikes on points ahead of the caster.
 */
export class DouzhanReplay {
  private run?: { age: number; origin: Vector3; focus: Vector3; direction: { x: number; z: number }; reduced: boolean; kind: ReplayKind;
    resolved: boolean; clones: boolean };
  constructor(private vfx: Pick<VisualDouzhan, 'cast' | 'ability' | 'mark'>) {}

  /** `at` = a point on the lane, `origin` = the caster. */
  start(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    if (!(DOUZHAN_REPLAY_KINDS as readonly string[]).includes(kind)) return false;
    const replayKind = kind as ReplayKind;
    const dx = at.x - origin.x, dz = at.z - origin.z, length = Math.hypot(dx, dz);
    const direction = length > 1e-3 ? { x: dx / length, z: dz / length } : { x: 0, z: -1 };
    const focus = origin.add(new Vector3(direction.x * 8, 0, direction.z * 8));
    this.run = { age: 0, origin: origin.clone(), focus, direction, reduced, kind: replayKind, resolved: false, clones: false };
    if (replayKind === 'skill') this.vfx.cast({ ...this.event('skill', 'cast'), direction }, origin, reduced, origin);
    if (replayKind === 'clone') {
      for (let i = 0; i < 3; i++) {
        const target = origin.add(new Vector3(direction.x * (4 + i * 3), 0, direction.z * (4 + i * 3)));
        this.vfx.ability({ ...this.event('clone-attack', 'attack'), x: target.x, z: target.z }, origin, target, reduced,
          { hasOrigin: true, targets: [target] });
      }
      this.run = undefined;
    }
    return true;
  }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    if (run.clones) this.showClones(run);
    if (run.resolved || run.age < (run.kind === 'skill' ? DEFAULT_WINDUP : 0)) return;
    run.resolved = true;
    this.vfx.ability({ ...this.event('skill', 'ability'), x: run.origin.x, z: run.origin.z, direction: run.direction, targets: [] },
      run.origin, run.origin, run.reduced, { hasOrigin: true, targets: [run.focus] });
    this.vfx.ability({ ...this.event('summon', 'trait'), x: run.focus.x, z: run.focus.z }, run.origin, run.focus, run.reduced,
      { hasOrigin: true, targets: [] });
    run.clones = true; run.age = 0;
  }

  clear(): void { this.run = undefined; }

  private showClones(run: NonNullable<DouzhanReplay['run']>): void {
    if (run.age > CLONE_SHOW) { this.run = undefined; return; }
    for (let i = 0; i < D.cloneCount; i++) {
      const angle = (Math.PI * 2 * i) / D.cloneCount;
      this.vfx.mark('clone', `debug-douzhan-clone-${i}`, new Vector3(run.focus.x + Math.cos(angle) * CLONE_RING, 0, run.focus.z + Math.sin(angle) * CLONE_RING), run.reduced);
    }
  }

  private event(prefix: string, kind: GameEvent['kind']): GameEvent {
    return { id: -1012, kind, skillId: `${prefix}-${D.id}`, windup: DEFAULT_WINDUP, source: 'debug-douzhan',
      x: this.run?.origin.x, z: this.run?.origin.z };
  }
}
