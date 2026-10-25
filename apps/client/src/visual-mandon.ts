import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitSpray } from './visual-kit-spray.js';
import { MandonBloom } from './visual-mandon-bloom.js';
import { MandonRings } from './visual-mandon-rings.js';
import { MandonStreams } from './visual-mandon-streams.js';
import { DEFAULT_WINDUP, MANDON_ATLAS, MANDON_ID, MANDON_SKILL } from './visual-mandon-timeline.js';

/**
 * Mẫu Đơn Tiên Tử (h00F) skill VFX on the kit. "Bách Hoa Hồi Xuân Khúc": petal glyphs and buds during the
 * windup (`cast`), the giant peony opening around her with a petal wave out to the heal radius, a peony-headed
 * petal stream to each healed ally (`ability` targets) that blooms on arrival, and a turning petal ring under
 * each ally for as long as the snapshot holds her haste buff. Her basic shot (`trait-h00F`, bounce) is not
 * claimed: those events and the markers this module does not own go to `fallback` (the tier recipe painter).
 */
export class VisualMandon implements HeroVfx {
  readonly heroId = MANDON_ID;
  private petals: KitSpray;
  private bloom: MandonBloom;
  private streams: MandonStreams;
  private rings: MandonRings;

  constructor(scene: Scene, private flipbooks: KitFlipbooks, private fallback?: HeroVfx) {
    this.petals = new KitSpray(scene, 'petal');
    this.rings = new MandonRings(scene, this.petals);
    this.bloom = new MandonBloom(flipbooks, this.petals, at => this.rings.wave(at));
    this.streams = new MandonStreams(scene, flipbooks, this.petals);
  }

  prepare(): void {
    for (const id of Object.values(MANDON_ATLAS)) this.flipbooks.ensure(id);
    this.fallback?.prepare();
  }

  /** `cast skill-h00F` (server windup) at Mẫu Đơn. */
  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    if (event.skillId !== MANDON_SKILL) return this.fallback?.cast?.(event, at, reduced) ?? false;
    this.bloom.cast(event.source ?? 'unknown', at, event.windup ?? DEFAULT_WINDUP, reduced);
    debug('visual.mandon.cast', { eventId: event.id, windup: event.windup ?? DEFAULT_WINDUP, reduced });
    return true;
  }

  /** `ability skill-h00F` (origin = Mẫu Đơn, `extra.targets` = healed allies). */
  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind !== 'ability' || event.skillId !== MANDON_SKILL) return this.fallback?.ability?.(event, origin, at, reduced, extra) ?? false;
    this.bloom.open(event.source ?? 'unknown', origin, reduced);
    const started = this.streams.cast(origin, extra?.targets ?? [], reduced);
    debug('visual.mandon.ability', { eventId: event.id, targets: extra?.targets.length ?? 0, streams: started, reduced });
    return true;
  }

  /** Snapshot marker `haste` on an ally holding her buff; anything else belongs to the recipe painter. */
  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    if (kind === 'haste') this.rings.mark(id, at, reduced);
    else this.fallback?.mark?.(kind, id, at, reduced);
  }

  tick(dt: number, time: number): void {
    this.bloom.tick(dt);
    this.streams.tick(dt);
    this.rings.tick(dt, time);
  }

  clear(): void {
    this.bloom.clear();
    this.streams.clear();
    this.rings.clear();
    this.petals.clear();
  }
}
