import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { XINGTIAN as X } from '../../../content/xingtian-design.js';
import type { VisualXingtian } from './visual-xingtian.js';
import { DEFAULT_WINDUP } from './visual-xingtian-timeline.js';

export const XINGTIAN_REPLAY_KINDS = ['skill', 'lobby', 'wave', 'shell'] as const;
type ReplayKind = (typeof XINGTIAN_REPLAY_KINDS)[number];
const DEBUG_ID = 'debug-xingtian';
/** Waves during the replayed berserk: the server fires one per basic attack (~0.47 s while berserk). */
const WAVE_INTERVAL = .47;

type Run = { age: number; at: Vector3; reduced: boolean; kind: ReplayKind; resolved: boolean; waves: number };

/**
 * `?debug=1` preview, client only, advanced by the module clock (clear cancels it). `skill`: the real sequence (cast →
 * windup → ability with three monsters around → the 5 s shell fed through the same marker as the snapshot, with a fire wave
 * every 0.47 s); `lobby`: the ability without a cast; `wave`: one wave with three monsters in the lane; `shell`: only the shell.
 */
export class XingtianReplay {
  private run?: Run;
  constructor(private vfx: Pick<VisualXingtian, 'cast' | 'ability' | 'markShell'>) {}

  /** `at` = the caster (the cast is centred on him). */
  start(kind: string, at: Vector3, reduced: boolean): boolean {
    if (!(XINGTIAN_REPLAY_KINDS as readonly string[]).includes(kind)) return false;
    const replayKind = kind as ReplayKind;
    this.run = { age: 0, at: at.clone(), reduced, kind: replayKind, resolved: false, waves: 0 };
    if (replayKind === 'skill') this.vfx.cast(this.event('skill', 'cast'), at, reduced, at);
    if (replayKind === 'wave') { this.wave(this.run); this.run = undefined; }
    return true;
  }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    const windup = run.kind === 'skill' ? DEFAULT_WINDUP : 0;
    if (!run.resolved && run.age >= windup && (run.kind === 'skill' || run.kind === 'lobby')) {
      run.resolved = true;
      this.vfx.ability({ ...this.event('skill', 'ability'), targets: ['d1', 'd2', 'd3'] }, run.at, run.at, run.reduced,
        { hasOrigin: run.kind === 'skill', targets: this.monsters(run.at) });
    }
    const berserk = X.berserkSeconds - (run.age - windup);
    if (run.kind !== 'lobby' && run.age >= windup && berserk > 0) {
      this.vfx.markShell(DEBUG_ID, run.at, berserk, run.reduced);
      if (run.kind === 'skill' && run.age - windup >= (run.waves + 1) * WAVE_INTERVAL) { run.waves++; this.wave(run); }
    }
    if (run.age >= windup + X.berserkSeconds + .5) this.run = undefined;
  }

  clear(): void { this.run = undefined; }

  private wave(run: Run): void {
    const direction = { x: 0, z: -1 };
    const lane = [0, 1, 2].map(i => new Vector3(run.at.x + (i - 1) * .5, 0, run.at.z - 1.5 - i * 1.8));
    this.vfx.ability({ ...this.event('fire-wave', 'trait'), direction }, run.at, run.at, run.reduced,
      { hasOrigin: true, targets: lane });
  }

  private monsters(at: Vector3): Vector3[] {
    return [[-3, -2], [2.5, -3.5], [0, 3]].map(([x, z]) => new Vector3(at.x + x, 0, at.z + z));
  }

  private event(prefix: string, kind: GameEvent['kind']): GameEvent {
    return { id: -1011, kind, skillId: `${prefix}-${X.id}`, windup: DEFAULT_WINDUP, source: DEBUG_ID,
      x: this.run?.at.x, z: this.run?.at.z };
  }
}
