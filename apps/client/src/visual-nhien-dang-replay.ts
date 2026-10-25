import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { NHIEN_DANG as N } from '../../../content/new-divine-design.js';
import type { VisualNhienDang } from './visual-nhien-dang.js';
import { CAGE_RADIUS, CAGE_SECONDS, DEFAULT_WINDUP } from './visual-nhien-dang-timeline.js';

export const NHIENDANG_REPLAY_KINDS = ['skill', 'lobby', 'reflect', 'attack'] as const;
type ReplayKind = (typeof NHIENDANG_REPLAY_KINDS)[number];

/** Allies handed a shield in the preview, as offsets from the caster. */
const ALLY_OFFSETS = [new Vector3(-3.4, 0, 1.2), new Vector3(3.2, 0, -.8), new Vector3(0, 0, 3.6)];
/** `reflect` and the basic hit of the `skill` preview fire this long after the resolve. */
const REFLECT_AT = 1.4, BASIC_AT = 2.2;
let serial = 0;

/**
 * `?debug=1` preview, client only, advanced by the module clock (clear cancels it). `skill`: the real server sequence
 * (cast → windup → three `shield-h03W` → `ability skill-h03W`, then the 5.5 s `lantern-cage` snapshot fed every frame, a
 * reflect and a basic hit while it stands); `lobby`: the ability without cast or origin; `reflect`: one reflect hit at
 * the point with no cage; `attack`: one basic hit.
 */
export class NhienDangReplay {
  private run?: { age: number; at: Vector3; origin: Vector3; reduced: boolean; kind: ReplayKind; resolved: boolean;
    reflected: boolean; struck: boolean; id: number };
  constructor(private vfx: Pick<VisualNhienDang, 'cast' | 'ability' | 'markCage'>) {}

  /** `at` = the point the preview aims at, `origin` = the caster. */
  start(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    if (!(NHIENDANG_REPLAY_KINDS as readonly string[]).includes(kind)) return false;
    const replayKind = kind as ReplayKind;
    const id = -(1000 + serial++);
    this.run = { age: 0, at: at.clone(), origin: origin.clone(), reduced, kind: replayKind, resolved: false, reflected: false, struck: false, id };
    if (replayKind === 'skill') this.vfx.cast(this.event('skill', 'cast'), origin, reduced, origin);
    if (replayKind === 'reflect') { this.reflect(); this.run = undefined; }
    if (replayKind === 'attack') { this.vfx.ability(this.event('trait', 'trait'), origin, at, reduced, { hasOrigin: true, targets: [at] }); this.run = undefined; }
    return true;
  }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    if (!run.resolved && run.age >= (run.kind === 'skill' ? DEFAULT_WINDUP : 0)) {
      run.resolved = true;
      run.age = 0;
      const hasOrigin = run.kind === 'skill';
      if (hasOrigin) for (const offset of ALLY_OFFSETS)
        this.vfx.ability({ ...this.event('shield', 'trait'), x: run.origin.x + offset.x, z: run.origin.z + offset.z }, run.origin,
          run.origin.add(offset), run.reduced, { hasOrigin: true, targets: [] });
      this.vfx.ability({ ...this.event('skill', 'ability'), x: run.origin.x, z: run.origin.z, targets: [] }, run.origin, run.origin, run.reduced,
        { hasOrigin, targets: [] });
    }
    if (!run.resolved) return;
    // The server keeps the ground effect for `duration` seconds; the preview feeds it as the snapshot would.
    const remaining = CAGE_SECONDS - run.age;
    if (remaining > 0) this.vfx.markCage(this.event('skill', 'ability').source ?? 'debug', run.origin, CAGE_RADIUS, remaining, run.reduced);
    if (!run.reflected && run.age >= REFLECT_AT) { run.reflected = true; this.reflect(); }
    if (!run.struck && run.age >= BASIC_AT) {
      run.struck = true;
      this.vfx.ability(this.event('trait', 'trait'), run.origin, run.at, run.reduced, { hasOrigin: true, targets: [run.at] });
    }
    if (remaining < -.6) this.run = undefined;
  }

  clear(): void { this.run = undefined; }

  private reflect(): void {
    const run = this.run;
    if (run) this.vfx.ability(this.event('reflect', 'trait'), run.origin, run.at, run.reduced, { hasOrigin: true, targets: [run.at] });
  }

  private event(prefix: string, kind: GameEvent['kind']): GameEvent {
    return { id: this.run?.id ?? -1, kind, skillId: `${prefix}-${N.id}`, windup: DEFAULT_WINDUP, source: 'debug-nhiendang',
      x: this.run?.at.x, z: this.run?.at.z };
  }
}
