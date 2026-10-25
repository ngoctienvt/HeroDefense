import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitSpray } from './visual-kit-spray.js';
import { NhiepMusic } from './visual-nhieptieuthien-music.js';
import { NhiepShells } from './visual-nhieptieuthien-shell.js';
import { NhiepStreams } from './visual-nhieptieuthien-streams.js';
import { DEFAULT_WINDUP, NHIEP_ATLAS, NHIEP_ID, NHIEP_SKILL } from './visual-nhieptieuthien-timeline.js';

/** Snapshot marker kind the battlefield sends for an ally holding her Frost Shield. */
export const NHIEP_SHIELD_MARK = 'frostshield';

/**
 * Nhiếp Tiểu Thiến (h03O) skill VFX on the kit. "Lan Nhược U Hồn Khúc": the orchid wreath of sound forms
 * around her during the windup (`cast`), opens on the `ability`, a note ribbon with an orchid head runs to each
 * healed ally (`ability` targets, at most 3) and blooms on arrival, and an ally whose heal overflowed shows the
 * ice shell for as long as the snapshot holds `frostShield` (5 s). Her basic shot / sound wave
 * (`trait-h03O`) is not claimed: those events and the markers this module does not own go to `fallback`
 * (the tier recipe painter).
 */
export class VisualNhieptieuthien implements HeroVfx {
  readonly heroId = NHIEP_ID;
  private flecks: KitSpray;
  private music: NhiepMusic;
  private streams: NhiepStreams;
  private shells: NhiepShells;

  constructor(scene: Scene, private flipbooks: KitFlipbooks, private fallback?: HeroVfx) {
    this.flecks = new KitSpray(scene, 'orchid');
    this.music = new NhiepMusic(flipbooks, this.flecks);
    this.streams = new NhiepStreams(scene, flipbooks, this.flecks);
    this.shells = new NhiepShells(flipbooks, this.flecks);
  }

  prepare(): void {
    for (const id of Object.values(NHIEP_ATLAS)) this.flipbooks.ensure(id);
    this.fallback?.prepare();
  }

  /** `cast skill-h03O` (server windup) at Tiểu Thiến. */
  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    if (event.skillId !== NHIEP_SKILL) return this.fallback?.cast?.(event, at, reduced) ?? false;
    this.music.cast(event.source ?? 'unknown', at, event.windup ?? DEFAULT_WINDUP, reduced);
    debug('visual.nhieptieuthien.cast', { eventId: event.id, windup: event.windup ?? DEFAULT_WINDUP, reduced });
    return true;
  }

  /** `ability skill-h03O` (origin = Tiểu Thiến, `extra.targets` = healed allies). */
  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind !== 'ability' || event.skillId !== NHIEP_SKILL) return this.fallback?.ability?.(event, origin, at, reduced, extra) ?? false;
    this.music.open(event.source ?? 'unknown', origin, reduced);
    const started = this.streams.cast(origin, extra?.targets ?? [], reduced);
    debug('visual.nhieptieuthien.ability', { eventId: event.id, targets: extra?.targets.length ?? 0, ribbons: started, reduced });
    return true;
  }

  /** Snapshot marker `frostshield` on an ally holding her shield; anything else belongs to the recipe painter. */
  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    if (kind === NHIEP_SHIELD_MARK) this.shells.mark(id, at, reduced);
    else this.fallback?.mark?.(kind, id, at, reduced);
  }

  tick(dt: number, time: number): void {
    this.music.tick(dt);
    this.streams.tick(dt);
    this.shells.tick(dt, time);
  }

  clear(): void {
    this.music.clear();
    this.streams.clear();
    this.shells.clear();
    this.flecks.clear();
  }
}
