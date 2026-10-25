import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { VisualActor } from './visual-actors.js';
import { ARRAY_RADIUS, DEFAULT_WINDUP, KIMTRA_ID } from './visual-kimtra-timeline.js';

const SKILL = `skill-${KIMTRA_ID}`;
/** How long a debug replay keeps the bells seated before they break. */
const REPLAY_BELL_SECONDS = 3.2;

/**
 * Remembers which units received Kim Tra's bell (`ability skill-h009` targets) so the snapshot shield on
 * them renders as the seated golden bell until it reaches 0. Other shields (h00E, h03T also reflect) never
 * show a bell. Debug replays force bells briefly. Pure presentation; gameplay never reads this.
 */
export class KimtraTracker {
  private bells = new Set<string>();
  private forced = new Map<string, number>();

  constructor(private now: () => number = () => performance.now() / 1000) {}

  record(event: GameEvent): void {
    for (const id of event.targets ?? []) this.bells.add(id);
  }

  /** True while the unit holds a shield that Kim Tra's bell gave it. */
  bell(id: string, shield: number): boolean {
    if ((this.forced.get(id) ?? 0) > this.now()) return true;
    if (!this.bells.has(id)) return false;
    if (shield > 0) return true;
    this.bells.delete(id);
    return false;
  }

  force(ids: readonly string[], seconds: number): void {
    const until = this.now() + seconds;
    for (const id of ids) this.forced.set(id, until);
  }

  clear(): void { this.bells.clear(); this.forced.clear(); }
}

export type KimtraReplayTarget = {
  showCast(event: GameEvent, at: Vector3): void;
  show(event: GameEvent, at: Vector3, origin?: Vector3, targets?: readonly Vector3[]): void;
};

export type KimtraReplayKind = 'skill' | 'trait' | 'crit' | 'reflect';

/**
 * `?debug=1` only: client-only events on the first Kim Tra in view, so the bell can be reviewed without
 * 100 Nộ. `skill` (default) = windup → bells on Kim Tra + the nearest ally in 4.5 → break after ~3 s;
 * `trait`/`crit` = one sword arc toward (x, z) or screen-up; `reflect` = three counter ring-outs.
 */
export function replayKimtra(actors: Map<string, VisualActor>, zone: number, effects: KimtraReplayTarget,
  tracker: KimtraTracker, focus?: (x: number, z: number) => void,
  options: { kind?: KimtraReplayKind; point?: { x: number; z: number } } = {}): boolean {
  const entries = [...actors.entries()].filter(([, actor]) => actor.zone === zone && actor.hp > 0 && !actor.dying);
  const caster = entries.find(([, actor]) => actor.heroId === KIMTRA_ID);
  if (!caster) { debug('visual.kimtra.replay.skip', { reason: 'no-caster' }); return false; }
  const [sourceId, source] = caster;
  const at = source.root.position.clone();
  focus?.(at.x, at.z);
  const base = { source: sourceId, zone, x: at.x, z: at.z } as const;
  const kind = options.kind ?? 'skill';
  if (kind === 'trait' || kind === 'crit') {
    const raw = options.point ? { x: options.point.x - at.x, z: options.point.z - at.z } : { x: 0, z: 1 };
    const length = Math.hypot(raw.x, raw.z) || 1;
    const hit = new Vector3(at.x + raw.x / length * 1.8, 0, at.z + raw.z / length * 1.8);
    effects.show({ ...base, id: -11, kind: 'attack', skillId: `trait-${KIMTRA_ID}`, geometry: 'frontal_cleave',
      isCrit: kind === 'crit', x: hit.x, z: hit.z }, hit, at);
    debug('visual.kimtra.replay', { kind });
    return true;
  }
  if (kind === 'reflect') {
    tracker.force([sourceId], 1.6);
    for (let i = 0; i < 3; i++) setTimeout(() => effects.show({ ...base, id: -12 - i, kind: 'trait',
      skillId: `reflect-${KIMTRA_ID}` }, source.root.position.clone(), source.root.position.clone()), 300 + i * 450);
    debug('visual.kimtra.replay', { kind });
    return true;
  }
  const ally = entries.filter(([id, actor]) => id !== sourceId && actor.heroId
    && actor.root.position.subtract(at).length() <= ARRAY_RADIUS)
    .sort((a, b) => a[1].root.position.subtract(at).length() - b[1].root.position.subtract(at).length())[0];
  const recipients = ally ? [sourceId, ally[0]] : [sourceId];
  effects.showCast({ ...base, id: -10, kind: 'cast', ability: 'shield', skillId: SKILL, windup: DEFAULT_WINDUP }, at);
  setTimeout(() => {
    const origin = source.root.position.clone();
    tracker.force(recipients, REPLAY_BELL_SECONDS);
    for (const id of recipients) {
      const unit = actors.get(id);
      if (!unit) continue;
      effects.show({ ...base, id: -9, kind: 'ability', ability: 'shield', skillId: SKILL, target: id, targets: recipients },
        unit.root.position.clone(), origin);
    }
  }, DEFAULT_WINDUP * 1000);
  debug('visual.kimtra.replay', { kind, ally: Boolean(ally) });
  return true;
}
