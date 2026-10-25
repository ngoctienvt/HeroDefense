import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { billboardCenter } from './visual-kit-billboard.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { MarkTracker, type MarkEntry } from './visual-kimsi-marks.js';
import { BLEED_DRIP_SECONDS, BLEED_FADE_LIFE, BLEED_LIFT, BLEED_SIZE, bleedFadeFrame, bleedFrame } from './visual-kimsi-timeline.js';

type State = { mesh?: Mesh; drip: number; dropped: boolean };
const MAX_BLEEDS = 20;

/**
 * Bleed scar on a monster that Kim Sí's feathers are bleeding (snapshot `bleed.remaining` > 0 and `casterId` an h016):
 * the Codex scar sheet appears (4 frames), holds (loop of 8) while the marker keeps arriving, and fades (4 frames)
 * with a few droplets when the snapshot drops it. The 3 s comes entirely from the server; the client keeps no timer
 * and draws no mist over the monster. Capped, compact, foreground pass.
 */
export class KimsiBleed {
  private tracker = new MarkTracker<State>(MAX_BLEEDS, () => ({ drip: BLEED_DRIP_SECONDS * .5, dropped: false }));

  constructor(private art: KitPainted, private bank: KitFxBank) {}

  mark(id: string, at: Vector3): boolean { return this.tracker.mark(id, at); }

  tick(dt: number, up: Vector3, reduced: boolean): void {
    this.tracker.tick(dt, entry => {
      const folding = entry.foldAge !== undefined;
      if (folding && entry.foldAge! >= BLEED_FADE_LIFE) { this.release(entry); return true; }
      const mesh = entry.state.mesh ??= this.art.acquire('bleed');
      if (!folding && !reduced) this.drip(entry, dt);
      if (folding && !entry.state.dropped) {
        entry.state.dropped = true;
        if (!reduced) this.bank.spray('goldwingblood').ring(new Vector3(entry.pos.x, BLEED_LIFT, entry.pos.z), .25, 6, .1, .6, .2);
      }
      if (!mesh) return false;
      const frame = folding ? bleedFadeFrame(entry.foldAge!) : reduced ? 8 : bleedFrame(entry.age);
      this.art.frame(mesh, frame, 4, 4);
      mesh.scaling.setAll(BLEED_SIZE);
      mesh.position.copyFrom(billboardCenter(new Vector3(entry.pos.x, 0, entry.pos.z), BLEED_SIZE, .5, up, BLEED_LIFT));
      mesh.visibility = 1;
      return false;
    });
  }

  clear(): void { this.tracker.clear(entry => this.release(entry)); }

  private drip(entry: MarkEntry<State>, dt: number): void {
    entry.state.drip -= dt;
    if (entry.state.drip > 0) return;
    entry.state.drip = BLEED_DRIP_SECONDS * (.8 + Math.random() * .5);
    this.bank.spray('goldwingblood').trail(new Vector3(entry.pos.x, BLEED_LIFT * .8, entry.pos.z), new Vector3(0, -.8, 0), 1);
  }

  private release(entry: MarkEntry<State>): void {
    this.art.release(entry.state.mesh);
    entry.state.mesh = undefined;
  }
}
