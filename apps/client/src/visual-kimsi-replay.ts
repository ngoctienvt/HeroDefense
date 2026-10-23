import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { KIMSI as K } from '../../../content/kimsi-design.js';
import type { VisualKimsi } from './visual-kimsi.js';
import { DEFAULT_WINDUP } from './visual-kimsi-timeline.js';

export const KIMSI_REPLAY_KINDS = ['skill', 'lobby', 'attack', 'berserk'] as const;
type ReplayKind = (typeof KIMSI_REPLAY_KINDS)[number];
type Run = { age: number; at: Vector3; reduced: boolean; kind: ReplayKind; resolved: boolean };

/** Dummy monsters: five spread inside R6.5 around the caster, used for cuts and bleed marks. */
export function replayTargets(center: Vector3, count = 5): Vector3[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + .4, radius = 2.2 + (i % 3) * 1.6;
    return new Vector3(center.x + Math.cos(angle) * radius, 0, center.z + Math.sin(angle) * radius);
  });
}

/**
 * `?debug=1` preview, client only, advanced by the module clock (clear cancels it). `skill`: the real sequence (cast,
 * windup, ability at the caster, five cuts); `lobby`: the ability without a cast (no gather); `attack`: a double
 * strike with three targets; `berserk`: the berserk marker every frame for 5.5 s plus a 3 s bleed on five dummies,
 * then the markers stop so the 0.3 s fold and the bleed fade can be inspected.
 */
export class KimsiReplay {
  private run?: Run;
  constructor(private vfx: Pick<VisualKimsi, 'cast' | 'ability' | 'mark'>) {}

  start(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    if (!(KIMSI_REPLAY_KINDS as readonly string[]).includes(kind)) return false;
    const replayKind = kind as ReplayKind;
    this.run = { age: 0, at: origin.clone(), reduced, kind: replayKind, resolved: false };
    if (replayKind === 'skill') this.vfx.cast(this.event('skill', 'cast', origin), origin, reduced, origin);
    if (replayKind === 'attack') {
      const away = Math.hypot(at.x - origin.x, at.z - origin.z) > .5 ? at : origin.add(new Vector3(0, 0, -3));
      const dir = this.unit(origin, away);
      const targets = [0, 1, 2].map(i => origin.add(new Vector3(dir.x * (1.6 + i), 0, dir.z * (1.6 + i))));
      for (let strike = 0; strike < 2; strike++)
        this.vfx.ability({ ...this.event('trait', 'attack', origin), direction: dir, isCrit: strike === 1 }, origin, targets[0],
          reduced, { hasOrigin: true, targets });
      this.run = undefined;
    }
    return true;
  }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    if (run.kind === 'berserk') { this.berserk(run); return; }
    if (run.resolved || run.age < (run.kind === 'skill' ? DEFAULT_WINDUP : 0)) return;
    run.resolved = true;
    const hasOrigin = run.kind === 'skill';
    this.vfx.ability(this.event('skill', 'ability', run.at), run.at, run.at, run.reduced,
      { hasOrigin, targets: replayTargets(run.at) });
    this.run = undefined;
  }

  clear(): void { this.run = undefined; }

  private berserk(run: Run): void {
    if (run.age < K.berserkSeconds) this.vfx.mark('berserk', 'debug-kimsi', run.at, run.reduced);
    if (run.age < K.bleedSeconds)
      replayTargets(run.at).forEach((p, i) => this.vfx.mark('bleed', `debug-kimsi-bleed-${i}`, p, run.reduced));
    if (run.age > K.berserkSeconds + .6) this.run = undefined;
  }

  private unit(from: Vector3, to: Vector3): { x: number; z: number } {
    const dx = to.x - from.x, dz = to.z - from.z, length = Math.hypot(dx, dz);
    return length > 1e-3 ? { x: dx / length, z: dz / length } : { x: 0, z: -1 };
  }

  private event(prefix: string, kind: GameEvent['kind'], at: Vector3): GameEvent {
    return { id: -1016, kind, skillId: `${prefix}-${K.id}`, windup: DEFAULT_WINDUP, source: 'debug-kimsi', x: at.x, z: at.z };
  }
}
