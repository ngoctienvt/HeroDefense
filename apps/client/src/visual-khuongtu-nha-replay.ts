import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { KHUONGTU as K } from '../../../content/khuongtu-nha-design.js';
import type { VisualKhuongTuNha } from './visual-khuongtu-nha.js';
import { BOLT_INTERVAL, DEFAULT_WINDUP } from './visual-khuongtu-nha-timeline.js';

export const KHUONGTU_REPLAY_KINDS = ['skill', 'lobby', 'attack', 'bolt'] as const;
type ReplayKind = (typeof KHUONGTU_REPLAY_KINDS)[number];

type Run = { age: number; at: Vector3; origin: Vector3; reduced: boolean; kind: ReplayKind; resolved: boolean; bolts: number };
type Target = Pick<VisualKhuongTuNha, 'cast' | 'ability' | 'markZone'>;

/** Where the eight bolts of the replayed zone land: three fixed spots inside R7 (the server picks the highest-HP enemy). */
const SPOTS: readonly [number, number][] = [[-2.6, -1.4], [2.2, 1.8], [.4, -3.1]];

/**
 * `?debug=1` preview, client only, advanced by the module clock (clear cancels it). `skill`: the real sequence — cast, the
 * resolve after the windup, the `phong-than` marker every frame with a counting-down `remaining`, and a `bolt-h019`
 * every 0.625 s (eight in all); `lobby`: the resolve without cast or marker (practice lobby: the zone closes by itself);
 * `attack`: the five-link chain; `bolt`: one strike on the point.
 */
export class KhuongtuReplay {
  private run?: Run;
  constructor(private vfx: Target) {}

  /** `at` = the locked point, `origin` = the caster. */
  start(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    if (!(KHUONGTU_REPLAY_KINDS as readonly string[]).includes(kind)) return false;
    const replayKind = kind as ReplayKind;
    this.run = { age: 0, at: at.clone(), origin: origin.clone(), reduced, kind: replayKind, resolved: false, bolts: 0 };
    if (replayKind === 'skill') this.vfx.cast(this.event('cast'), at, reduced);
    if (replayKind === 'attack') {
      const targets = [0, 1, 2, 3, 4].map(i => at.add(new Vector3(-3 + i * 1.6, 0, i % 2 ? 1.2 : -1.2)));
      this.vfx.ability({ ...this.event('attack'), skillId: `trait-${K.id}` }, origin, targets[0], reduced, { hasOrigin: true, targets });
      this.run = undefined;
    }
    if (replayKind === 'bolt') {
      this.vfx.ability({ ...this.event('trait'), skillId: `bolt-${K.id}` }, origin, at, reduced, { hasOrigin: true, targets: [at] });
      this.run = undefined;
    }
    return true;
  }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    const windup = run.kind === 'skill' ? DEFAULT_WINDUP : 0;
    if (!run.resolved && run.age >= windup) {
      run.resolved = true;
      this.vfx.ability({ ...this.event('ability'), x: run.at.x, z: run.at.z, targets: [] }, run.origin, run.at, run.reduced,
        { hasOrigin: run.kind === 'skill', targets: [] });
      if (run.kind === 'lobby') { this.run = undefined; return; }
    }
    if (!run.resolved) return;
    const elapsed = run.age - windup;
    this.vfx.markZone('replay-zone', run.at, Math.max(0, K.zoneSeconds - elapsed), run.reduced);
    while (run.bolts < K.boltCount && elapsed >= (run.bolts + 1) * BOLT_INTERVAL) {
      const [dx, dz] = SPOTS[run.bolts % SPOTS.length], spot = new Vector3(run.at.x + dx, 0, run.at.z + dz);
      run.bolts++;
      this.vfx.ability({ ...this.event('trait'), skillId: `bolt-${K.id}`, x: spot.x, z: spot.z }, run.origin, spot, run.reduced,
        { hasOrigin: true, targets: [spot] });
    }
    if (elapsed >= K.zoneSeconds) this.run = undefined;
  }

  clear(): void { this.run = undefined; }

  private event(kind: GameEvent['kind']): GameEvent {
    return { id: -1019, kind, skillId: `skill-${K.id}`, windup: DEFAULT_WINDUP, source: 'debug-khuongtu',
      x: this.run?.at.x, z: this.run?.at.z };
  }
}
