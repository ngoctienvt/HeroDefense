import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { VisualBodhi } from './visual-bodhi.js';
import { BO_DE } from '../../../content/new-divine-design.js';
import { DEFAULT_WINDUP } from './visual-bodhi-timeline.js';

export const BODHI_REPLAY_KINDS = ['skill', 'lobby', 'attack', 'blessing'] as const;
type ReplayKind = (typeof BODHI_REPLAY_KINDS)[number];
type Buff = { id: string; at: Vector3 };

/** Offsets of the two debug allies around the caster (world units). */
const ALLY_OFFSETS: readonly [number, number][] = [[-4.2, 1.5], [4.6, -1.8]];
/** Seconds between debug accents (the double-hit sheet at a target in front). */
const ACCENT_EVERY = .8;

/**
 * `?debug=1` preview, client only, advanced by the module clock (clear cancels it). `skill`: the real sequence (cast →
 * windup → one `blessing` per ally → ability with two chosen allies → 5 s buff marker, with accents on a target in front);
 * `lobby`: ability and blessings without cast or origin (reconnect); `attack`: one basic whisk; `blessing`: only the
 * blessings, the 5 s marker and the accents.
 */
export class BodhiReplay {
  private run?: { age: number; origin: Vector3; reduced: boolean; kind: ReplayKind; resolved: boolean; buffs: Buff[];
    buffAge: number; accentAge: number };
  constructor(private vfx: Pick<VisualBodhi, 'cast' | 'ability' | 'markBlessing' | 'accent'>) {}

  /** `at` = a point in front of the caster (the accent target), `origin` = the caster. */
  start(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    if (!(BODHI_REPLAY_KINDS as readonly string[]).includes(kind)) return false;
    const replayKind = kind as ReplayKind;
    this.run = { age: 0, origin: origin.clone(), reduced, kind: replayKind, resolved: false, buffs: [], buffAge: -1, accentAge: 0 };
    if (replayKind === 'skill') this.vfx.cast(this.event('skill', 'cast'), origin, reduced, origin);
    if (replayKind === 'attack') {
      this.vfx.ability({ ...this.event('trait', 'attack'), target: 'debug-enemy' }, origin, at, reduced, { hasOrigin: true, targets: [at] });
      this.run = undefined;
    }
    if (replayKind === 'blessing') this.resolve(false);
    return true;
  }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    if (!run.resolved && run.age >= (run.kind === 'skill' ? DEFAULT_WINDUP : 0)) this.resolve(run.kind === 'skill');
    if (run.buffAge < 0) return;
    run.buffAge += dt;
    const remaining = BO_DE.buffSeconds - run.buffAge;
    if (remaining <= 0) { this.run = undefined; return; }
    for (const buff of run.buffs) this.vfx.markBlessing(buff.id, buff.at, remaining, run.reduced);
    run.accentAge += dt;
    if (run.accentAge >= ACCENT_EVERY) {
      run.accentAge = 0;
      const target = run.origin.add(new Vector3(0, 0, -6));
      this.vfx.accent(run.buffs[0].id, target, run.reduced);
    }
  }

  clear(): void { this.run = undefined; }

  /** The server's order: one blessing per chosen ally, then the ability naming both. */
  private resolve(hasOrigin: boolean): void {
    const run = this.run;
    if (!run) return;
    run.resolved = true;
    const allies = ALLY_OFFSETS.map(([x, z], i) => ({ id: `debug-ally-${i}`, at: run.origin.add(new Vector3(x, 0, z)) }));
    for (const ally of allies) {
      this.vfx.ability({ ...this.event('blessing', 'trait'), target: ally.id, x: ally.at.x, z: ally.at.z },
        run.origin, ally.at, run.reduced, { hasOrigin: true, targets: [] });
    }
    if (run.kind !== 'blessing') {
      this.vfx.ability({ ...this.event('skill', 'ability'), x: run.origin.x, z: run.origin.z, targets: allies.map(a => a.id) },
        run.origin, run.origin, run.reduced, { hasOrigin, targets: allies.map(a => a.at) });
    }
    run.buffs = allies; run.buffAge = 0;
  }

  private event(prefix: string, kind: GameEvent['kind']): GameEvent {
    return { id: -1003, kind, skillId: `${prefix}-${BO_DE.id}`, windup: DEFAULT_WINDUP, source: 'debug-bodhi',
      x: this.run?.origin.x, z: this.run?.origin.z };
  }
}
