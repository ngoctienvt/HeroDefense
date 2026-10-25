import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { cameraLook, placeStrip, resetStrip } from './visual-de-tuan-strip.js';
import type { KitSpray } from './visual-kit-spray.js';
import { screenUp } from './visual-kit-billboard.js';
import type { KitPainted } from './visual-kit-painted.js';
import { placeBillboard, setFrame } from './visual-tuong-than-assets.js';
import type { TuongThanPieces } from './visual-tuong-than-pieces.js';
import { DRAIN_ASPECT, DRAIN_HEIGHT, drainAlpha, drainLength, drainProgress, drainSeconds, EDDY_SECONDS, EDDY_SIZE,
  eddyAlpha, eddyFrame, MAX_DRAINS } from './visual-tuong-than-timeline.js';

/**
 * Blood drain on the resolve: for every monster the server listed, a strip of blood (pale bone tip leading) is yanked from
 * the monster into the caster, accelerating head first, and a blood eddy stays on the ground where it stood. The targets
 * are the event's real `targets`; allies who receive the heal are not in the event, so no ribbon is drawn to them.
 * Reduced motion draws one still strip per monster and no spray.
 */
export class TuongThanDrain {
  constructor(private scene: Scene, private art: KitPainted, private pieces: TuongThanPieces, private spray: KitSpray) {}

  /** Positions are copied: monsters keep moving or die while the strip flies. */
  launch(caster: Vector3, targets: readonly Vector3[], reduced: boolean): void {
    const home = new Vector3(caster.x, DRAIN_HEIGHT, caster.z);
    let drains = 0;
    for (const target of targets) {
      if (drains >= MAX_DRAINS) { debug('visual.tuongthan.cap', { layer: 'drain', targets: targets.length }); break; }
      const from = new Vector3(target.x, DRAIN_HEIGHT, target.z);
      if (this.strip(from, home, reduced)) drains++;
      this.eddy(target, reduced);
      if (!reduced) this.spray.ring(target, .5, 6, .9, 2.4, 4.5);
    }
    debug('visual.tuongthan.drain', { targets: targets.length, drains, reduced });
  }

  private strip(from: Vector3, to: Vector3, reduced: boolean): boolean {
    const road = to.subtract(from), distance = road.length();
    if (distance < .6) return false;
    const unit = road.scale(1 / distance), length = drainLength(distance), width = length * DRAIN_ASPECT;
    const life = drainSeconds(reduced);
    return this.pieces.add('drain', false, life, 0, (mesh, age) => {
      // Starts centred on the monster (head just beyond it), ends with the head on the caster.
      const progress = drainProgress(age, reduced);
      const start = from.add(unit.scale(length / 2));
      const head = Vector3.Lerp(start, to, progress);
      if (!placeStrip(mesh, head, unit, cameraLook(this.scene), length, width)) mesh.setEnabled(false);
      mesh.visibility = drainAlpha(age, reduced);
    }, resetStrip);
  }

  private eddy(at: Vector3, reduced: boolean): void {
    const here = at.clone();
    this.pieces.add('eddy', false, EDDY_SECONDS, 0, (mesh, age) => {
      placeBillboard(mesh, 'eddy', here, EDDY_SIZE, screenUp(this.scene));
      setFrame(this.art, mesh, 'eddy', eddyFrame(age, reduced));
      mesh.visibility = .75 * eddyAlpha(age);
    });
  }
}
