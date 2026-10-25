import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { billboardCenter } from './visual-kit-billboard.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { CUT_LIFT, CUT_REDUCED_LIFE, CUT_LIFE, cutAlpha, cutFrame } from './visual-kimsi-timeline.js';

type Cut = { at: Vector3; age: number; size: number; reduced: boolean; mesh?: Mesh };
const MAX_CUTS = 24;

/**
 * Two crossed feather cuts over a monster the server listed (Codex feather-cut sheet, 8 frames, billboard in the
 * foreground pass: over the monster, under heroes) with a few armour chips. Only ever placed on server-confirmed
 * targets; there is no area blast here. `add` queues the cut after `delay` (the storm wave reaches far targets last).
 */
export class KimsiCuts {
  private cuts: Cut[] = [];

  constructor(private art: KitPainted, private bank: KitFxBank) {}

  add(at: Vector3, size: number, delay: number, reduced: boolean): void {
    const cut = (): void => {
      if (this.cuts.length >= MAX_CUTS) return;
      this.cuts.push({ at: at.clone(), age: 0, size, reduced });
      if (!reduced) this.bank.spray('goldwing').ring(new Vector3(at.x, CUT_LIFT, at.z), .25, 7, .1, 2.6, 3.2);
    };
    if (delay > 0) this.bank.after(delay, cut); else cut();
  }

  tick(dt: number, up: Vector3): void {
    for (let i = this.cuts.length - 1; i >= 0; i--) {
      const cut = this.cuts[i];
      cut.age += dt;
      if (cut.age >= (cut.reduced ? CUT_REDUCED_LIFE : CUT_LIFE)) { this.free(cut); continue; }
      cut.mesh ??= this.art.acquire('cut');
      if (!cut.mesh) continue;
      cut.mesh.position.copyFrom(billboardCenter(new Vector3(cut.at.x, 0, cut.at.z), cut.size, .5, up, CUT_LIFT));
      cut.mesh.scaling.setAll(cut.size);
      cut.mesh.visibility = cutAlpha(cut.age, cut.reduced);
      this.art.frame(cut.mesh, cutFrame(cut.age, cut.reduced), 4, 2);
    }
  }

  clear(): void { for (const cut of [...this.cuts]) this.free(cut); }

  private free(cut: Cut): void {
    this.art.release(cut.mesh);
    const index = this.cuts.indexOf(cut);
    if (index >= 0) this.cuts.splice(index, 1);
  }
}
