import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { debug } from './debug.js';
import { billboardCenter } from './visual-kit-billboard.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { DEFAULT_WINDUP, RETURN_ANCHOR, returnAlpha, returnFrame, RETURN_SECONDS, SHEET_COLUMNS, SHEET_ROWS, SMOKE_SIZE,
  VANISH_ANCHOR, vanishAlpha, vanishEnd, vanishFrame } from './visual-lucnhi-timeline.js';

type Vanish = { at: Vector3; age: number; windup: number; resolvedAt?: number; reduced: boolean; mesh?: Mesh };
type Return = { at: Vector3; age: number; reduced: boolean; mesh?: Mesh };
type Marker = { at: Vector3; reduced: boolean; touched: boolean };
const MAX_VANISH = 8, MAX_RETURN = 8;

/**
 * Ink smoke on the caster. The art never moves or hides the hero: the server's `shadowAssault` does that (battlefield
 * hides the sprite from the snapshot). `begin` (cast) gathers the whorl and seam over the windup; `resolve` (ability)
 * disperses it the instant the sprite disappears. While the snapshot keeps calling `mark('assault')` the hero is hidden;
 * the frame the marker is lost (six pulses done, or the hero left the field) the return sheet plays once where he
 * last stood. A marker that shows up without a cast (reconnect) plays no vanish, only the eventual return.
 */
export class LucnhiSmoke {
  private vanishes = new Map<string, Vanish>();
  private returns: Return[] = [];
  private markers = new Map<string, Marker>();

  constructor(private art: KitPainted, private bank: KitFxBank) {}

  begin(source: string, at: Vector3, windup: number, reduced: boolean): void {
    this.free(this.vanishes.get(source));
    if (this.vanishes.size >= MAX_VANISH) { debug('visual.lucnhi.cap', { layer: 'vanish' }); return; }
    this.vanishes.set(source, { at: at.clone(), age: 0, windup, reduced });
    if (!reduced) this.bank.spray('lucnhi').rise(at, 1.8, 16);
  }

  /** Resolve: a cast in flight disperses; without one the tail still plays when the caster position is known. */
  resolve(source: string, origin: Vector3 | undefined, reduced: boolean): boolean {
    const run = this.vanishes.get(source);
    if (run) { run.resolvedAt ??= run.age; return true; }
    if (!origin || this.vanishes.size >= MAX_VANISH) return false;
    this.vanishes.set(source, { at: origin.clone(), age: 0, windup: DEFAULT_WINDUP, resolvedAt: 0, reduced });
    return true;
  }

  /** Snapshot marker, every frame while `shadowAssault` is on (called before `tick`'s sweep). */
  mark(id: string, at: Vector3, reduced: boolean): void {
    const marker = this.markers.get(id);
    if (marker) { marker.at.copyFrom(at); marker.touched = true; marker.reduced = reduced; return; }
    this.markers.set(id, { at: at.clone(), reduced, touched: true });
  }

  tick(dt: number, up: Vector3): void {
    for (const [id, marker] of this.markers) {
      if (marker.touched) { marker.touched = false; continue; }
      this.markers.delete(id);
      this.playReturn(marker.at, marker.reduced);
    }
    for (const [source, run] of this.vanishes) {
      run.age += dt;
      if (run.age >= vanishEnd(run.windup, run.resolvedAt)) { this.free(run); this.vanishes.delete(source); continue; }
      const alpha = vanishAlpha(run.age, run.windup, run.resolvedAt, run.reduced);
      run.mesh ??= this.art.acquire('vanish');
      this.place(run.mesh, run.at, SMOKE_SIZE, VANISH_ANCHOR, up, vanishFrame(run.age, run.windup, run.resolvedAt), alpha);
    }
    for (let i = this.returns.length - 1; i >= 0; i--) {
      const run = this.returns[i];
      run.age += dt;
      if (run.age >= RETURN_SECONDS) { this.art.release(run.mesh); this.returns.splice(i, 1); continue; }
      run.mesh ??= this.art.acquire('return');
      this.place(run.mesh, run.at, SMOKE_SIZE, RETURN_ANCHOR, up, returnFrame(run.age), returnAlpha(run.age, run.reduced));
    }
  }

  /** No return plays on a clear: the zone or match is changing, not the assault ending. */
  clear(): void {
    for (const run of this.vanishes.values()) this.free(run);
    for (const run of this.returns) this.art.release(run.mesh);
    this.vanishes.clear(); this.returns.length = 0; this.markers.clear();
  }

  private playReturn(at: Vector3, reduced: boolean): void {
    if (this.returns.length >= MAX_RETURN) { debug('visual.lucnhi.cap', { layer: 'return' }); return; }
    this.returns.push({ at: at.clone(), age: 0, reduced });
    if (!reduced) this.bank.spray('lucnhi').ring(at, .4, 10, .3, 1.8, 3.2);
    debug('visual.lucnhi.return', { reduced });
  }

  private place(mesh: Mesh | undefined, at: Vector3, size: number, anchor: number, up: Vector3, frame: number, alpha: number): void {
    if (!mesh) return;
    mesh.position.copyFrom(billboardCenter(new Vector3(at.x, 0, at.z), size, anchor, up));
    mesh.scaling.setAll(size);
    mesh.visibility = alpha;
    this.art.frame(mesh, frame, SHEET_COLUMNS, SHEET_ROWS);
  }

  private free(run: Vanish | undefined): void { if (run) this.art.release(run.mesh); }
}
