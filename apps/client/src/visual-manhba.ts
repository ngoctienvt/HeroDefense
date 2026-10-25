import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitSpray } from './visual-kit-spray.js';
import { ManhbaBonds } from './visual-manhba-bonds.js';
import { ManhbaLinks } from './visual-manhba-links.js';
import { ManhbaPour } from './visual-manhba-pour.js';
import { DEFAULT_WINDUP, MANHBA_ATLAS, MANHBA_ID, MANHBA_SKILL, MAX_LINKS } from './visual-manhba-timeline.js';

/**
 * Mạnh Bà (h00I) skill VFX on the kit. "Vong Xuyên Hồn Liên": wisps and bubbles rise during the windup (`cast`), the
 * pot pours Vong Xuyên soup and the strand fan bursts toward the first monster, then a painted soul rope runs
 * hand → monster 1 → 2 → 3 → 4 in the server's chain order (`ability.targets`); each landing pulses a water-ring node
 * and starts the Đồng Mệnh bond: a turning water ring under every linked monster and the ropes held between them for
 * the 4 s the server keeps `soulLink`. Her basic shot (`trait-h00I`, bouncing water) is not claimed: those events and
 * the markers this module does not own go to `fallback` (the tier recipe painter).
 */
export class VisualManhba implements HeroVfx {
  readonly heroId = MANHBA_ID;
  private spray: KitSpray;
  private pour: ManhbaPour;
  private bonds: ManhbaBonds;
  private links: ManhbaLinks;

  constructor(scene: Scene, private flipbooks: KitFlipbooks, private fallback?: HeroVfx) {
    this.spray = new KitSpray(scene, 'vongxuyen');
    this.pour = new ManhbaPour(scene, flipbooks, this.spray);
    this.bonds = new ManhbaBonds(scene, flipbooks, this.spray);
    this.links = new ManhbaLinks(scene, this.bonds);
  }

  prepare(): void {
    for (const id of Object.values(MANHBA_ATLAS)) this.flipbooks.ensure(id);
    this.fallback?.prepare();
  }

  /** `cast skill-h00I` (server windup) at Mạnh Bà. */
  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    if (event.skillId !== MANHBA_SKILL) return this.fallback?.cast?.(event, at, reduced) ?? false;
    this.pour.cast(event.source ?? 'unknown', at, event.windup ?? DEFAULT_WINDUP, reduced);
    debug('visual.manhba.cast', { eventId: event.id, windup: event.windup ?? DEFAULT_WINDUP, reduced });
    return true;
  }

  /**
   * `ability skill-h00I` (origin = Mạnh Bà, `extra.targets` = linked monsters in chain order). The per-hit `attack`
   * events the generic chain path would add for this skill are swallowed too: the ropes already draw every hop.
   */
  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.skillId !== MANHBA_SKILL) return this.fallback?.ability?.(event, origin, at, reduced, extra) ?? false;
    if (event.kind !== 'ability') return true;
    const points = (extra?.targets ?? []).slice(0, MAX_LINKS);
    // Ids line up with positions only when the battlefield found every actor; otherwise ropes use synthetic keys and stay put.
    const ids = event.targets ?? [];
    const matched = ids.length >= points.length && points.length > 0 && extra?.targets.length === ids.length;
    const keys = points.map((_, index) => (matched ? ids[index] : `${event.id}:${index}`));
    this.pour.open(event.source ?? 'unknown', origin, points[0], reduced);
    const hops = this.links.cast(origin, points, keys, reduced);
    debug('visual.manhba.ability', { eventId: event.id, targets: points.length, hops, matched, reduced });
    return true;
  }

  /** Snapshot marker `bond` on a monster holding the soul link; anything else belongs to the recipe painter. */
  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    if (kind === 'bond') this.bonds.mark(id, at);
    else this.fallback?.mark?.(kind, id, at, reduced);
  }

  tick(dt: number, time: number): void {
    this.pour.tick(dt);
    this.links.tick(dt, time);
    this.bonds.tick(dt, time);
  }

  clear(): void {
    this.pour.clear();
    this.links.clear();
    this.bonds.clear();
    this.spray.clear();
  }
}
