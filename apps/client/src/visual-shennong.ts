import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { SHENNONG } from '../../../content/shennong-design.js';
import { debug } from './debug.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitPainted } from './visual-kit-painted.js';
import { KitSpray } from './visual-kit-spray.js';
import { prepareSnArt } from './visual-shennong-art.js';
import { ShennongReplay } from './visual-shennong-replay.js';
import { ShennongRoots } from './visual-shennong-roots.js';
import { ShennongStreams } from './visual-shennong-streams.js';
import { DEFAULT_WINDUP } from './visual-shennong-timeline.js';
import { ShennongWeakness } from './visual-shennong-weakness.js';
import { ShennongWhip } from './visual-shennong-whip.js';
import { ShennongZone } from './visual-shennong-zone.js';

/** Painted planes alive at once: 4 zones × (pot, grove, 7 mist) + 9 roots/ghost trees + 32 weakness + 14 comets, with headroom. */
const PAINTED_CAPACITY = 150;

/**
 * Thần Nông Bách Thảo Luyện Thiên Đỉnh (h01E) on the kit, Codex art from tier56-codex-art (palette/spray `herbal`).
 * Windup (`cast`, 0.25 s): the bronze vessel drops on the locked point while herb vapour is drawn in.
 * Impact (`ability skill-h01E`, R8.5): the vessel erupts (foreground), the medicine wave races out, roots and leaves spread.
 * Hold (`shennong-grove` ground, 5.5 s): mist columns round the ring, the three server-summoned ancient trees rise from
 * bursting roots, a life stream pulses to every ally the zone heals, monsters with `attackWeak` carry a wilting leaf.
 * Close (last 0.45 s): mist is drawn back into the vessel, roots retract. Presentation only; the server decides everything.
 */
export class VisualShennong implements HeroVfx {
  readonly heroId = SHENNONG.id;
  private art: KitPainted;
  private spray: KitSpray;
  private zone: ShennongZone;
  private roots: ShennongRoots;
  private weakness: ShennongWeakness;
  private streams: ShennongStreams;
  private whip: ShennongWhip;
  private preview = new ShennongReplay(this);

  constructor(scene: Scene) {
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'shennong');
    this.spray = new KitSpray(scene, 'herbal');
    this.zone = new ShennongZone(scene, this.art, this.spray);
    this.roots = new ShennongRoots(scene, this.art, this.spray);
    this.weakness = new ShennongWeakness(scene, this.art);
    this.streams = new ShennongStreams(scene, this.art, this.spray);
    this.whip = new ShennongWhip(scene, this.spray);
  }

  /** Idempotent; a texture that failed or is still loading keeps the shader telegraph and retries on use. */
  prepare(): void { prepareSnArt(this.art); }

  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    if (event.skillId !== `skill-${SHENNONG.id}`) return false;
    this.prepare();
    this.zone.cast(at, event.windup ?? DEFAULT_WINDUP, reduced, event.source);
    debug('visual.shennong.cast', { eventId: event.id, windup: event.windup ?? DEFAULT_WINDUP, reduced });
    return true;
  }

  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    switch (event.skillId) {
      case `skill-${SHENNONG.id}`:
        if (event.kind !== 'ability') return false;
        this.prepare();
        this.zone.impact(at, reduced, event.source);
        debug('visual.shennong.impact', { eventId: event.id, targets: event.targets?.length ?? 0, reduced, radius: SHENNONG.zoneRadius });
        return true;
      case `trait-${SHENNONG.id}`:
        this.whip.attack(event, origin, at, reduced);
        return true;
      case `herb-heal-${SHENNONG.id}`:
        this.whip.heal(extra?.targets ?? [], reduced);
        return true;
      default: return false;
    }
  }

  /** `shennong-grove` ground snapshot with its server radius and `remaining`. */
  markGrove(id: string, at: Vector3, radius: number, remaining: number, reduced = false): void {
    if (![radius, remaining].every(Number.isFinite) || radius <= 0 || remaining <= 0) return;
    this.prepare();
    this.zone.markGrove(id, at, radius, remaining, reduced);
  }

  /** Snapshot of a live ancient-tree summon (`summonDuration` as remaining); the actor mesh owns HP, selection and death. */
  markTree(id: string, at: Vector3, remaining: number, reduced = false, ghost = false): void {
    this.prepare();
    this.roots.mark(id, at, remaining, reduced, ghost);
  }

  /** A monster the grove currently weakens (`attackWeak`, refreshed each server tick). */
  markWeakness(id: string, at: Vector3, remaining: number, reduced = false): void {
    this.prepare();
    this.weakness.mark(id, at, remaining, reduced);
  }

  /** An ally the zone heals (any distance inside the zone; the caller filters eligibility, never by R8.5). */
  markHeal(id: string, from: Vector3, to: Vector3, remaining: number, reduced = false): void {
    this.prepare();
    this.streams.mark(id, from, to, remaining, reduced);
  }

  tick(dt: number, time: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.preview.tick(dt);
    this.zone.tick(dt, time);
    this.roots.tick();
    this.weakness.tick(dt);
    this.streams.tick(dt, time);
    this.whip.tick(dt);
  }

  clear(): void {
    this.preview.clear(); this.zone.clear(); this.roots.clear(); this.weakness.clear(); this.streams.clear();
    this.whip.clear(); this.spray.clear(); this.art.clear();
    debug('visual.shennong.clear', {});
  }

  replay(kind: string, caster: Vector3, at: Vector3, reduced: boolean): boolean {
    this.prepare();
    return this.preview.start(kind, caster, at, reduced);
  }
}
