import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitPainted } from './visual-kit-painted.js';
import type { KitSpray } from './visual-kit-spray.js';
import { prepareNuwaArt } from './visual-nuwa-assets.js';
import { NuwaBlessing } from './visual-nuwa-blessing.js';
import { NuwaRain } from './visual-nuwa-rain.js';
import { NuwaReplay } from './visual-nuwa-replay.js';
import { NuwaRift } from './visual-nuwa-rift.js';
import { NuwaStones } from './visual-nuwa-stones.js';
import { DEFAULT_WINDUP } from './visual-nuwa-timeline.js';

/** Painted planes alive at once: rift (3) + rain/hit/mark per monster (3 × 36) + mending lines (22). */
const PAINTED_CAPACITY = 140;
/** Five-colour shards: green, yellow, blue, rose (the four stones) and earth for the dust and pebbles. */
const SPRAYS = ['jade', 'gold', 'frost', 'petal', 'earth'] as const;

/**
 * Nữ Oa (h01C) on the kit: Nữ Oa Bổ Thiên and the results it spawns.
 * Server order: `cast skill-h01C` (0.25 s windup on the caster) → `ability skill-h01C` (stone rain 380 % + slow on every monster
 * of the lane, listed in `targets`) → `trait blessing-h01C` (heal 400 % on every deployed ally, overflow = `nuwaShields`, 35 %
 * `five-color` ward) → optional `trait revive-h01C` (allies stand up beside her at 40 %). The legacy adapter calls these methods.
 * The normal attack (`trait-h01C`, `stone-blessing-h01C`) keeps its small original stones in NuwaStones.
 */
export class VisualNuwa {
  private art: KitPainted;
  private bank: KitFxBank;
  private rift: NuwaRift;
  private rain: NuwaRain;
  private support: NuwaBlessing;
  private stones: NuwaStones;
  private preview = new NuwaReplay(this);
  private time = 0;

  constructor(scene: Scene) {
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'nuwa');
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    const sprays: KitSpray[] = SPRAYS.map(name => this.bank.spray(name));
    this.rift = new NuwaRift(scene, this.art, sprays);
    this.rain = new NuwaRain(scene, this.art, this.bank, sprays);
    this.support = new NuwaBlessing(scene, this.art, this.bank, sprays);
    this.stones = new NuwaStones(scene);
  }

  /** Atlases load only once a Nữ Oa is on the field (idempotent). */
  prepare(): void { prepareNuwaArt(this.art); }

  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): void {
    this.prepare();
    // The cast point may be the target; the rift opens over the caster herself.
    this.rift.cast(event.source ?? 'unknown', origin ?? at, event.windup ?? DEFAULT_WINDUP, reduced);
  }

  attack(event: GameEvent, from: Vector3, targets: readonly Vector3[], reduced: boolean): void {
    this.stones.attack(event, from, targets, reduced);
  }

  impact(event: GameEvent, caster: Vector3, targets: readonly Vector3[], reduced: boolean): void {
    this.prepare();
    const hadCast = this.rift.release(event.source ?? 'unknown', caster, reduced);
    // Only the monsters the server listed are struck: no fallback to the caster and no fabricated field when the list is empty.
    const rendered = this.rain.fall(caster, targets, reduced);
    debug('visual.nuwa.impact', { eventId: event.id, targets: targets.length, rendered, lateCast: !hadCast, reduced });
  }

  blessing(event: GameEvent, targets: readonly Vector3[], reduced: boolean): void {
    if (event.skillId === 'stone-blessing-h01C') { this.stones.shieldFacets(event, targets, reduced); return; }
    this.prepare();
    this.support.blessing(targets, reduced);
  }

  /** Each ally who actually stood up (the shared revive sheet is drawn by the effects layer). */
  revive(event: GameEvent, targets: readonly Vector3[], reduced: boolean): void {
    this.prepare();
    this.support.revive(targets, reduced);
  }

  /** Snapshot marker: `ward.kind === 'five-color'` of one ally, called every frame while it lasts. */
  markWard(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    this.prepare();
    this.support.markWard(id, at, remaining, reduced);
  }

  tick(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.time += dt;
    this.preview.tick(dt);
    this.rift.tick(dt, this.time);
    this.rain.tick(dt);
    this.support.tick(dt, this.time);
    this.stones.tick(dt);
    this.bank.tick(dt, this.time);
  }

  clear(): void {
    this.preview.clear();
    this.rift.clear(); this.rain.clear(); this.support.clear(); this.stones.clear();
    this.bank.clear(); this.art.clear();
    this.time = 0;
  }

  /** `?debug=1` replay (`__vfxReplay('h01C', kind?)`); presentation only. */
  replay(kind: string, caster: Vector3, reduced: boolean): boolean {
    this.prepare();
    return this.preview.start(kind, caster, reduced);
  }
}
