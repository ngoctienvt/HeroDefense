import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { HeroVfx } from './visual-kit-hero.js';
import { KitSpray } from './visual-kit-spray.js';
import { MoctraFrenzy } from './visual-moctra-frenzy.js';
import { MoctraLashes } from './visual-moctra-lash.js';
import { DEFAULT_WINDUP, MOCTRA_ATLAS, MOCTRA_ID, MOCTRA_SKILL, SPORE_GATE, VINE_SKILL } from './visual-moctra-timeline.js';

/**
 * Mộc Tra (h00A) skill VFX on the kit. "Ngô Câu Mộc Ảnh Vũ": vine sprouts during the windup (`cast`), the
 * awakening burst with twin hook-sword afterimages (`ability`), the whirling thorn wreath while the snapshot
 * holds `berserk`, every `vine-beam-h00A` shot as a thorny vine whose tip is a jade hook blade, and poison
 * spores on enemies his vines poisoned (snapshot `poison`). The basic swing (`trait-h00A`) is not claimed:
 * it falls through to its existing painter.
 */
export class VisualMoctra implements HeroVfx {
  readonly heroId = MOCTRA_ID;
  private leaves: KitSpray;
  private toxin: KitSpray;
  private frenzy: MoctraFrenzy;
  private lashes: MoctraLashes;
  private spores = new Map<string, number>();
  private time = 0;

  constructor(scene: Scene, private flipbooks: KitFlipbooks) {
    this.leaves = new KitSpray(scene, 'jade');
    this.toxin = new KitSpray(scene, 'toxin');
    this.frenzy = new MoctraFrenzy(scene, flipbooks, this.leaves);
    this.lashes = new MoctraLashes(scene, flipbooks, this.toxin);
  }

  prepare(): void {
    for (const id of Object.values(MOCTRA_ATLAS)) this.flipbooks.ensure(id);
  }

  /** `cast skill-h00A` (server windup) at Mộc Tra. */
  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    if (event.skillId !== MOCTRA_SKILL) return false;
    this.frenzy.cast(event.source ?? 'unknown', at, event.windup ?? DEFAULT_WINDUP, reduced);
    debug('visual.moctra.cast', { eventId: event.id, windup: event.windup ?? DEFAULT_WINDUP, reduced });
    return true;
  }

  /** `ability skill-h00A` (origin = Mộc Tra; `at` is the nearest enemy, unused) and each `vine-beam-h00A`. */
  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean): boolean {
    if (event.kind === 'ability' && event.skillId === MOCTRA_SKILL) {
      this.frenzy.awaken(event.source ?? 'unknown', origin, reduced);
      return true;
    }
    if (event.skillId === VINE_SKILL) {
      const shot = this.lashes.shoot(origin, at, reduced);
      if (shot && event.source) this.frenzy.kick(event.source);
      debug('visual.moctra.lash', { eventId: event.id, shot, distance: +Math.hypot(at.x - origin.x, at.z - origin.z).toFixed(2) });
      return true;
    }
    return false;
  }

  /** Snapshot markers: `frenzy` on Mộc Tra in Cuồng Vũ, `poison` on an enemy his vines poisoned. */
  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    if (kind === 'frenzy') { this.frenzy.mark(id, at, reduced); return; }
    if (kind !== 'poison' || reduced) return; // reduced motion: the shared poison body tint still shows the status
    if (this.time - (this.spores.get(id) ?? -Infinity) < SPORE_GATE) return;
    this.spores.set(id, this.time);
    this.toxin.trail(new Vector3(at.x, 1.1, at.z), new Vector3(0, 1.3, 0), 2);
  }

  tick(dt: number, time: number): void {
    this.time = time;
    this.frenzy.tick(dt);
    this.lashes.tick(dt);
    if (this.spores.size > 64) {
      for (const [id, last] of this.spores) if (time - last > SPORE_GATE * 4) this.spores.delete(id);
    }
  }

  clear(): void {
    this.frenzy.clear();
    this.lashes.clear();
    this.leaves.clear();
    this.toxin.clear();
    this.spores.clear();
  }
}
