import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { CONGCONG as C } from '../../../content/congcong-design.js';
import { debug } from './debug.js';
import type { VisualActor } from './visual-actors.js';

/**
 * Remembers which enemies Cộng Công's wave froze, so their server `frozen` status renders as
 * the black-ice cage instead of the generic frost ring. Debug replays force cages/wards briefly
 * without any snapshot status (pure presentation; gameplay never reads this).
 */
export class CongcongTracker {
  private frozen = new Map<string, number>();
  private forcedCage = new Map<string, number>();
  private forcedWard = new Map<string, number>();

  constructor(private now: () => number = () => performance.now() / 1000) {}

  record(event: GameEvent): void {
    const until = this.now() + C.iceVisualSeconds + .5;
    for (const id of event.targets ?? []) this.frozen.set(id, until);
  }

  /** True while the enemy shows the server frost status and was hit by the wave. */
  cage(id: string, status: string | undefined): boolean {
    const now = this.now();
    if ((this.forcedCage.get(id) ?? 0) > now) return true;
    const until = this.frozen.get(id);
    if (until === undefined) return false;
    if (until <= now) { this.frozen.delete(id); return false; }
    return status === 'frost';
  }

  ward(id: string): boolean { return (this.forcedWard.get(id) ?? 0) > this.now(); }

  force(cages: string[], wards: string[]): void {
    const now = this.now();
    for (const id of cages) this.forcedCage.set(id, now + C.windup + C.iceVisualSeconds);
    for (const id of wards) this.forcedWard.set(id, now + C.windup + C.shieldSeconds);
  }

  clear(): void { this.frozen.clear(); this.forcedCage.clear(); this.forcedWard.clear(); }
}

export type CongcongReplayTarget = {
  showCast(event: GameEvent, at: Vector3): void;
  show(event: GameEvent, at: Vector3, origin?: Vector3, targets?: readonly Vector3[]): void;
};

/**
 * `?debug=1` only: replays the full ultimate on the first Cộng Công in view with fake,
 * client-only events so the VFX can be reviewed without filling 100 Nộ. No command reaches the server.
 */
export function replayCongcong(actors: Map<string, VisualActor>, zone: number, effects: CongcongReplayTarget,
  tracker: CongcongTracker, focus?: (x: number, z: number) => void,
  options: { kind?: 'ultimate' | 'cleave' | 'cage'; direction?: { x: number; z: number } } = {}): boolean {
  const entries = [...actors.entries()].filter(([, actor]) => actor.zone === zone && actor.hp > 0 && !actor.dying);
  const caster = entries.find(([, actor]) => actor.heroId === C.id);
  if (!caster) { debug('visual.congcong.replay.skip', { reason: 'no-caster' }); return false; }
  const [sourceId, source] = caster;
  const at = source.root.position.clone();
  focus?.(at.x, at.z);
  const enemies = entries.filter(([, actor]) => !actor.heroId
    && actor.root.position.subtract(at).length() <= C.waveRadius).map(([id]) => id);
  const allies = entries.filter(([, actor]) => actor.heroId
    && actor.root.position.subtract(at).length() <= C.shieldRadius);
  tracker.force(enemies, allies.map(([id]) => id));
  const base = { source: sourceId, zone, x: at.x, z: at.z } as const;
  if (options.kind === 'cage') {
    // Preview the black-ice cage scale/placement on the caster itself (no enemy has to survive).
    tracker.force([sourceId], []);
    debug('visual.congcong.replay', { kind: 'cage' });
    return true;
  }
  if (options.kind === 'cleave') {
    // World-space direction; (1, 0) must read toward screen-right, (0, 1) away from the camera.
    const raw = options.direction ?? { x: 0, z: 1 };
    const length = Math.hypot(raw.x, raw.z) || 1;
    const direction = { x: raw.x / length, z: raw.z / length };
    effects.show({ ...base, id: -4, kind: 'attack', skillId: 'trait-h01G', geometry: 'frontal_cleave', direction,
      x: at.x + direction.x * 2, z: at.z + direction.z * 2 }, at.add(new Vector3(direction.x * 2, 0, direction.z * 2)), at);
    debug('visual.congcong.replay', { kind: 'cleave', direction });
    return true;
  }
  effects.showCast({ ...base, id: -1, kind: 'cast', ability: 'nova', skillId: 'skill-h01G', windup: C.windup }, at);
  setTimeout(() => {
    const origin = source.root.position.clone();
    effects.show({ ...base, id: -2, kind: 'ability', ability: 'nova', skillId: 'skill-h01G', targets: enemies },
      origin, origin);
    for (const [allyId, ally] of allies) {
      effects.show({ ...base, id: -3, kind: 'ability', ability: 'shield', skillId: 'shield-h01G',
        target: allyId, targets: [allyId] }, ally.root.position.clone(), origin);
    }
  }, C.windup * 1000);
  debug('visual.congcong.replay', { enemies: enemies.length, allies: allies.length });
  return true;
}
