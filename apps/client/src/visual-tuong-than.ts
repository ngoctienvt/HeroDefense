import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { TUONG_THAN as T } from '../../../content/tuong-than-design.js';
import { debug } from './debug.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitPainted } from './visual-kit-painted.js';
import { KitSpray } from './visual-kit-spray.js';
import { prepareTuongThanArt } from './visual-tuong-than-assets.js';
import { TuongThanClaw } from './visual-tuong-than-claw.js';
import { TuongThanDrain } from './visual-tuong-than-drain.js';
import { TuongThanFlow } from './visual-tuong-than-flow.js';
import { TuongThanGenerals } from './visual-tuong-than-generals.js';
import { TuongThanPieces } from './visual-tuong-than-pieces.js';
import { TuongThanReplay } from './visual-tuong-than-replay.js';
import { TuongThanSea } from './visual-tuong-than-sea.js';
import { TuongThanSurge } from './visual-tuong-than-surge.js';

/** Painted planes alive at once: transient pieces (cap 64) + surge decals/ripples + sea decals + general decals. */
const PAINTED_CAPACITY = 100;
const PIECE_CAP = 64;

/**
 * Tướng Thần (h03Z) on the kit: Huyết Hải Vạn Thi Trận and everything it spawns.
 * Server events: `cast skill-h03Z` (0.25 s windup on the caster) → `ability skill-h03Z` (every monster in R8.5 takes 460 %
 * + 100 % true damage, caster healed to full, allies shielded, four generals summoned) → `blood-general-h03Z` per
 * general (its real spawn point) → snapshot `blood-sea` (radius, 8 s) and the generals' `summonDuration` (8 s) →
 * `blood-general-hit-h03Z` per general strike. The normal attack and blood-warrior events keep the old shock ring.
 * The facade keeps the entry points `VisualEffects` already calls (markZone, markGeneral, generalHit, prepare).
 */
export class VisualTuongThan implements HeroVfx {
  readonly heroId = T.id;
  private art: KitPainted;
  private spray: KitSpray;
  private pieces: TuongThanPieces;
  private flow: TuongThanFlow;
  private surge: TuongThanSurge;
  private drain: TuongThanDrain;
  private sea: TuongThanSea;
  private generals: TuongThanGenerals;
  private claw: TuongThanClaw;
  private preview = new TuongThanReplay(this);

  constructor(scene: Scene) {
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'tuongthan');
    this.spray = new KitSpray(scene, 'blood');
    this.pieces = new TuongThanPieces(this.art, PIECE_CAP, 'pieces');
    this.flow = new TuongThanFlow(scene);
    this.surge = new TuongThanSurge(scene, this.art, this.pieces, this.spray, this.flow);
    this.drain = new TuongThanDrain(scene, this.art, this.pieces, this.spray);
    this.sea = new TuongThanSea(scene, this.art, this.spray, this.flow);
    this.generals = new TuongThanGenerals(scene, this.art, this.pieces, this.spray);
    this.claw = new TuongThanClaw(scene);
  }

  /** Atlases load only once a Tướng Thần is on the field (idempotent). */
  prepare(): void { prepareTuongThanArt(this.art); }

  /** The cast belongs to the caster himself (the event point is his own position). */
  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.skillId !== `skill-${T.id}`) return false;
    this.prepare();
    this.surge.cast(event.source ?? 'unknown', origin ?? at, event.windup ?? .25, reduced);
    return true;
  }

  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    switch (event.skillId) {
      case `skill-${T.id}`: {
        if (event.kind !== 'ability') return false;
        this.prepare();
        const caster = extra?.hasOrigin ? origin : at;
        this.surge.impact(event.source ?? 'unknown', caster, reduced);
        this.drain.launch(caster, extra?.targets ?? [], reduced);
        return true;
      }
      case `blood-general-${T.id}`:
        this.prepare();
        this.generals.summon(event.target, at, reduced);
        return true;
      case `trait-${T.id}`:
      case `blood-warrior-${T.id}`:
        this.claw.attack(event, at, reduced);
        return true;
      default: return false;
    }
  }

  /** Snapshot: `blood-sea` ground effect (called every frame it lasts). */
  markZone(id: string, at: Vector3, radius: number, remaining: number, reduced = false): void {
    this.prepare();
    this.sea.mark(id, at, radius, remaining, reduced);
  }

  /** Snapshot: a blood general with `summonDuration` left. */
  markGeneral(id: string, at: Vector3, remaining: number, reduced = false): void {
    this.prepare();
    this.generals.mark(id, at, remaining, reduced);
  }

  /** `blood-general-hit-h03Z` on the struck monster. */
  generalHit(event: GameEvent, at: Vector3, reduced: boolean): void {
    this.prepare();
    this.generals.hit(at, reduced);
    debug('visual.tuongthan.general.hit', { eventId: event.id, reduced });
  }

  tick(dt: number, time = 0): void {
    this.preview.tick(dt);
    this.surge.tick(dt, time);
    this.sea.tick(dt, time);
    this.generals.tick(dt, time);
    this.flow.tick(dt, time);
    this.pieces.tick(dt);
    this.claw.tick(dt);
  }

  clear(): void {
    this.preview.clear();
    this.surge.clear(); this.sea.clear(); this.generals.clear(); this.flow.clear();
    this.pieces.clear(); this.claw.clear();
    this.spray.clear(); this.art.clear();
    debug('visual.tuongthan.clear', {});
  }

  /** `?debug=1` replay (`__vfxReplay('h03Z', kind?)`); presentation only. */
  replay(kind: string, caster: Vector3, reduced: boolean): boolean {
    this.prepare();
    return this.preview.start(kind, caster, reduced);
  }
}
