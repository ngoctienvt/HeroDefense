import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { billboardCenter } from './visual-kit-billboard.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { MarkTracker, type MarkEntry } from './visual-kimsi-marks.js';
import { MANTLE_ASPECT, MANTLE_COLUMNS, MANTLE_FOLD_SECONDS, MANTLE_LIFT, MANTLE_ROWS, MANTLE_WIDTH, mantleAppear,
  mantleAtlasFrame, mantleFold, mantleStep, type MantleLayer } from './visual-kimsi-timeline.js';

type State = { meshes: Partial<Record<MantleLayer, Mesh>>; mote: number; folded: boolean };
const LAYERS: readonly MantleLayer[] = ['shoulder', 'feet'];
const MAX_MANTLES = 6;

/**
 * Berserk feathers (5.5 s in play, `berserk.remaining` > 0 in the snapshot): two bands of the Codex frenzy sheet
 * stand out to both sides of the hero, one at the shoulders and one at the feet (foreground pass: under the hero
 * sprite, so he stays crisp and nothing lifts him off the ground). The marker arrives every frame while the status
 * lasts; when the snapshot drops it the bands fold in and fall for 0.3 s and a few gold chips drop. Reduced motion:
 * one still frame, no motes.
 */
export class KimsiMantle {
  private tracker = new MarkTracker<State>(MAX_MANTLES, () => ({ meshes: {}, mote: 0, folded: false }));

  constructor(private art: KitPainted, private bank: KitFxBank) {}

  mark(id: string, at: Vector3): void { this.tracker.mark(id, at); }

  tick(dt: number, up: Vector3, reduced: boolean): void {
    this.tracker.tick(dt, entry => {
      const folding = entry.foldAge !== undefined;
      if (folding && entry.foldAge! >= MANTLE_FOLD_SECONDS) { this.release(entry); return true; }
      if (folding && !entry.state.folded) {
        entry.state.folded = true;
        if (!reduced) this.bank.spray('goldwing').ring(new Vector3(entry.pos.x, .6, entry.pos.z), .9, 14, .6, 1.6, 1.8);
      }
      for (const layer of LAYERS) this.draw(entry, layer, up, reduced, folding ? entry.foldAge! : undefined);
      if (!folding && !reduced) this.motes(entry, dt);
      return false;
    });
  }

  clear(): void { this.tracker.clear(entry => this.release(entry)); }

  private draw(entry: MarkEntry<State>, layer: MantleLayer, up: Vector3, reduced: boolean, foldAge?: number): void {
    const mesh = entry.state.meshes[layer] ??= this.art.acquire('mantle');
    if (!mesh) return;
    const fold = foldAge === undefined ? undefined : mantleFold(layer, foldAge);
    const step = fold?.step ?? (reduced ? 4 : mantleStep(layer, entry.age, layer === 'feet' ? 2 : 0));
    const width = MANTLE_WIDTH[layer] * (fold?.widthScale ?? 1);
    const height = MANTLE_WIDTH[layer] / MANTLE_ASPECT * (fold?.heightScale ?? 1);
    this.art.frame(mesh, mantleAtlasFrame(layer, step), MANTLE_COLUMNS, MANTLE_ROWS);
    mesh.scaling.set(width, height, 1);
    mesh.position.copyFrom(billboardCenter(new Vector3(entry.pos.x, 0, entry.pos.z), height, .5, up,
      MANTLE_LIFT[layer] - (fold?.drop ?? 0)));
    mesh.visibility = (fold?.alpha ?? 1) * mantleAppear(entry.age, reduced);
  }

  /** A gold chip lifts off the bands now and then; nothing continuous, so crowds stay readable. */
  private motes(entry: MarkEntry<State>, dt: number): void {
    entry.state.mote -= dt;
    if (entry.state.mote > 0) return;
    entry.state.mote = .35 + Math.random() * .25;
    this.bank.spray('goldwing').rise(new Vector3(entry.pos.x, 1, entry.pos.z), 1.8, 2);
  }

  private release(entry: MarkEntry<State>): void {
    for (const layer of LAYERS) this.art.release(entry.state.meshes[layer]);
    entry.state.meshes = {};
  }
}
