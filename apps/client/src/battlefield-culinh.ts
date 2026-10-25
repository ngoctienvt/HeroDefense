import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { VisualActor } from './visual-actors.js';
import { CULINH_ID, CULINH_SKILL, DEFAULT_WINDUP, QUAKE_RADIUS, QUAKE_SKILL, SLOW_SECONDS, WARD_RADIUS, WARD_SECONDS } from './visual-culinh-timeline.js';

/** Snapshot fields the marker reads (a subset of Unit, so tests need no full GameState). */
export type CulinhSnapshotUnit = { shield?: number; ward?: { remaining: number; kind?: string } };

/** Seconds a recipient may still lack `ward` in the snapshot after the event (the snapshot trails the event). */
const SNAPSHOT_GRACE = 1.5;

/**
 * Remembers which units received Cự Linh's ward (`ability skill-h00E` targets) so the snapshot `ward` on them
 * renders as the iron bulwark ring until it ends. Wards without his event, and wards of a kind another hero
 * draws (black-water, five-color), never show it. Debug replays force it briefly. Pure presentation.
 */
export class CulinhTracker {
  private granted = new Map<string, { until: number; seen: boolean }>();
  private forced = new Map<string, number>();
  private slows = new Map<string, number>();
  private shields = new Map<string, number>();

  constructor(private now: () => number = () => performance.now() / 1000) {}

  record(event: GameEvent): void {
    for (const id of event.targets ?? []) this.granted.set(id, { until: this.now() + SNAPSHOT_GRACE, seen: false });
  }

  /** `trait quake-h00E`: the enemies the hammer quake slowed (server list, 1.2 s). */
  recordSlow(event: GameEvent): void {
    const until = this.now() + SLOW_SECONDS;
    for (const id of event.targets ?? []) this.slows.set(id, until);
  }

  slowed(id: string): boolean {
    const until = this.slows.get(id);
    if (until === undefined) return false;
    if (until > this.now()) return true;
    this.slows.delete(id);
    return false;
  }

  /**
   * Shield state of a ringed unit from the snapshot: `hit` when the shield dropped since the last frame (it took
   * damage), `worn` once it is gone while the ward still holds. The server sends no event for either.
   */
  shieldPhase(id: string, shield: number): { hit: boolean; worn: boolean } {
    const last = this.shields.get(id);
    this.shields.set(id, shield);
    return { hit: last !== undefined && shield < last - .5, worn: shield <= 0 };
  }

  /** True while the unit holds a ward that Cự Linh's skill gave it. */
  ward(id: string, unit: CulinhSnapshotUnit): boolean {
    if ((this.forced.get(id) ?? 0) > this.now()) return true;
    const entry = this.granted.get(id);
    if (!entry) return false;
    if ((unit.ward?.remaining ?? 0) > 0 && !unit.ward?.kind) { entry.seen = true; return true; }
    this.shields.delete(id);
    if (entry.seen || this.now() > entry.until) this.granted.delete(id);
    return false;
  }

  force(ids: readonly string[], seconds: number): void {
    const until = this.now() + seconds;
    for (const id of ids) this.forced.set(id, until);
  }

  clear(): void { this.granted.clear(); this.forced.clear(); this.slows.clear(); this.shields.clear(); }
}

export type CulinhReplayTarget = {
  showCast(event: GameEvent, at: Vector3): void;
  show(event: GameEvent, at: Vector3, origin?: Vector3, targets?: readonly Vector3[]): void;
};

/**
 * `?debug=1` only: client-only events on the first Cự Linh in view, so the skill can be reviewed without 100 Nộ.
 * windup → hammer slam and wall → bulwark rings on him and the allies within 4.5, kept for the 4.5 s ward.
 */
export function replayCulinh(actors: Map<string, VisualActor>, zone: number, effects: CulinhReplayTarget,
  tracker: CulinhTracker, focus?: (x: number, z: number) => void): boolean {
  const entries = [...actors.entries()].filter(([, actor]) => actor.zone === zone && actor.hp > 0 && !actor.dying);
  const caster = entries.find(([, actor]) => actor.heroId === CULINH_ID);
  if (!caster) { debug('visual.culinh.replay.skip', { reason: 'no-caster' }); return false; }
  const [sourceId, source] = caster;
  const at = source.root.position.clone();
  focus?.(at.x, at.z);
  const base = { source: sourceId, zone, x: at.x, z: at.z } as const;
  const allies = entries.filter(([id, actor]) => id !== sourceId && actor.heroId
    && actor.root.position.subtract(at).length() <= WARD_RADIUS);
  const recipients = [sourceId, ...allies.map(([id]) => id)];
  effects.showCast({ ...base, id: -40, kind: 'cast', ability: 'shield', skillId: CULINH_SKILL, windup: DEFAULT_WINDUP }, at);
  setTimeout(() => {
    const origin = source.root.position.clone();
    tracker.force(recipients, WARD_SECONDS);
    const hits = recipients.flatMap(id => { const unit = actors.get(id); return unit ? [unit.root.position.clone()] : []; });
    const slowed = entries.filter(([, actor]) => !actor.heroId && actor.root.position.subtract(origin).length() <= QUAKE_RADIUS);
    tracker.recordSlow({ id: -42, kind: 'trait', skillId: QUAKE_SKILL, targets: slowed.map(([id]) => id) });
    effects.show({ ...base, id: -42, kind: 'trait', skillId: QUAKE_SKILL, targets: slowed.map(([id]) => id), value: QUAKE_RADIUS },
      origin.clone(), origin, slowed.map(([, actor]) => actor.root.position.clone()));
    effects.show({ ...base, id: -41, kind: 'ability', ability: 'shield', skillId: CULINH_SKILL, target: sourceId, targets: recipients },
      origin.clone(), origin, hits);
  }, DEFAULT_WINDUP * 1000);
  debug('visual.culinh.replay', { allies: allies.length });
  return true;
}
