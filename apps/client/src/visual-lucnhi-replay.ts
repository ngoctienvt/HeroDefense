import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { LUCNHI as L } from '../../../content/lucnhi-design.js';
import type { VisualLucnhi } from './visual-lucnhi.js';
import { DEFAULT_WINDUP } from './visual-lucnhi-timeline.js';

export const LUCNHI_REPLAY_KINDS = ['skill', 'attack', 'exposed'] as const;
type ReplayKind = (typeof LUCNHI_REPLAY_KINDS)[number];
const FAKE_OFFSETS: readonly (readonly [number, number])[] = [[2, 0], [-2.5, 1.5], [.5, -3]];
/** How long the weakness seals stay in the `exposed` kind, then split. */
const EXPOSED_SECONDS = 3;

type Run = { age: number; at: Vector3; origin: Vector3; reduced: boolean; kind: ReplayKind; resolved: boolean; nextPulse: number;
  targets: Vector3[] };

/**
 * `?debug=1` preview, client only, advanced by the module clock (clear cancels it). `skill`: the real sequence —
 * cast → windup → ability → six pulses 0.25 s apart on three fake targets with the `assault` marker held for 1.5 s (so the
 * return plays), and the `exposed` seals held until they split; `attack`: one basic cudgel with three targets;
 * `exposed`: only the seals for 3 s. Markers are driven here before the module's sweeps (VisualLucnhi.tick order).
 */
export class LucnhiReplay {
  private run?: Run;
  constructor(private vfx: Pick<VisualLucnhi, 'cast' | 'ability' | 'mark'>) {}

  start(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    if (!(LUCNHI_REPLAY_KINDS as readonly string[]).includes(kind)) return false;
    const replayKind = kind as ReplayKind;
    const targets = FAKE_OFFSETS.map(([x, z]) => new Vector3(at.x + x, 0, at.z + z));
    this.run = { age: 0, at: at.clone(), origin: origin.clone(), reduced, kind: replayKind, resolved: false, nextPulse: 1, targets };
    if (replayKind === 'skill') this.vfx.cast({ ...this.event('skill', 'cast'), x: at.x, z: at.z }, origin, reduced, origin);
    if (replayKind === 'attack') {
      const dx = at.x - origin.x, dz = at.z - origin.z, length = Math.hypot(dx, dz) || 1;
      const direction = { x: dx / length, z: dz / length };
      const hits = [3, 5, 7].map(d => new Vector3(origin.x + direction.x * d, 0, origin.z + direction.z * d));
      this.vfx.ability({ ...this.event('trait', 'attack'), direction, isCrit: true }, origin, hits[0], reduced,
        { hasOrigin: true, targets: hits });
      this.run = undefined;
    }
    return true;
  }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    if (run.kind === 'exposed') {
      run.targets.forEach((target, i) => this.vfx.mark('exposed', `replay-${i}`, target, run.reduced));
      if (run.age >= EXPOSED_SECONDS) this.run = undefined;
      return;
    }
    if (!run.resolved && run.age >= DEFAULT_WINDUP) {
      run.resolved = true;
      this.vfx.ability({ ...this.event('skill', 'ability'), x: run.at.x, z: run.at.z }, run.origin, run.at, run.reduced,
        { hasOrigin: true, targets: [] });
    }
    if (!run.resolved) return;
    const since = run.age - DEFAULT_WINDUP;
    if (since < L.strikeDuration) this.vfx.mark('assault', 'replay', run.origin, run.reduced);
    const interval = L.strikeDuration / L.strikes;
    while (run.nextPulse <= L.strikes && since + 1e-9 >= run.nextPulse * interval) {
      this.vfx.ability({ ...this.event('shadow-hit', 'ability'), x: run.at.x, z: run.at.z, strikeIndex: run.nextPulse,
        targets: run.targets.map((_, i) => `replay-${i}`) }, run.origin, run.at, run.reduced,
        { hasOrigin: true, targets: run.targets });
      run.nextPulse++;
    }
    if (run.nextPulse > 1) run.targets.forEach((target, i) => this.vfx.mark('exposed', `replay-${i}`, target, run.reduced));
    // Seals stay 5 s after the last pulse (the server's weakness time), then the marker stops and they split.
    if (since >= L.strikeDuration + L.weaknessSeconds) this.run = undefined;
  }

  clear(): void { this.run = undefined; }

  private event(prefix: string, kind: GameEvent['kind']): GameEvent {
    return { id: -1003, kind, skillId: `${prefix}-${L.id}`, windup: DEFAULT_WINDUP, source: 'debug-lucnhi' };
  }
}
