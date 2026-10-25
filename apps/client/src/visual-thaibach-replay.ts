import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { THAIBACH as T } from '../../../content/thaibach-design.js';
import type { VisualThaibach } from './visual-thaibach.js';
import { DEFAULT_WINDUP, STATUS_SECONDS } from './visual-thaibach-timeline.js';

export const THAIBACH_REPLAY_KINDS = ['skill', 'revive', 'guard', 'idle', 'lobby'] as const;
type ReplayKind = (typeof THAIBACH_REPLAY_KINDS)[number];

/**
 * `?debug=1` preview, client only, advanced by the module clock (clear cancels it). `skill`: the real sequence (cast
 * at the caster → windup → ability to one ally 4.5 units away with the caster as origin) plus the 5 s haste marker;
 * `revive`: cast → `revive-h015` where the ally stands up (caster + 1.2, -0.8) plus the 1.5 s invulnerability marker;
 * `guard`: the passive `star-guard-h015` with no cast; `idle`: a cast with no resolve (nobody to help: folds after the
 * grace); `lobby`: the ability without cast or origin (reconnect). `at` is the caster.
 */
export class ThaibachReplay {
  private run?: { age: number; caster: Vector3; ally: Vector3; reduced: boolean; kind: ReplayKind; resolved: boolean };
  constructor(private vfx: Pick<VisualThaibach, 'cast' | 'ability' | 'mark'>) {}

  start(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    if (!(THAIBACH_REPLAY_KINDS as readonly string[]).includes(kind)) return false;
    const replayKind = kind as ReplayKind;
    const caster = origin.clone();
    const ally = replayKind === 'revive' ? caster.add(new Vector3(1.2, 0, -.8)) : caster.add(new Vector3(4.5, 0, 1.5));
    this.run = { age: 0, caster, ally, reduced, kind: replayKind, resolved: false };
    if (replayKind === 'skill' || replayKind === 'revive' || replayKind === 'idle') this.vfx.cast(this.event('skill', 'cast'), caster, reduced, caster);
    if (replayKind === 'guard') {
      this.vfx.ability(this.event('star-guard', 'trait'), caster, ally, reduced, { hasOrigin: true, targets: [ally] });
      this.run = undefined;
    }
    return true;
  }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    this.vfx.mark('caster', 'debug-thaibach', run.caster, run.reduced);
    if (run.resolved) {
      const status = run.kind === 'revive' ? 'immortal' : 'haste';
      this.vfx.mark(status, 'debug-ally', run.ally, run.reduced);
      if (run.age >= DEFAULT_WINDUP + STATUS_SECONDS[status]) this.run = undefined;
      return;
    }
    if (run.kind === 'idle') { if (run.age >= 2) this.run = undefined; return; }
    if (run.age < (run.kind === 'lobby' ? 0 : DEFAULT_WINDUP)) return;
    run.resolved = true;
    const revive = run.kind === 'revive';
    this.vfx.ability({ ...this.event(revive ? 'revive' : 'skill', revive ? 'trait' : 'ability'), target: 'debug-ally',
      targets: ['debug-ally'], x: run.ally.x, z: run.ally.z }, run.caster, run.ally, run.reduced,
    { hasOrigin: run.kind !== 'lobby', targets: [run.ally] });
  }

  clear(): void { this.run = undefined; }

  private event(prefix: string, kind: GameEvent['kind']): GameEvent {
    return { id: -1015, kind, skillId: `${prefix}-${T.id}`, windup: DEFAULT_WINDUP, source: 'debug-thaibach' };
  }
}
