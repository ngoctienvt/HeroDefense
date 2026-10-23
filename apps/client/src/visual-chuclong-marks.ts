import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { KitSpray } from './visual-kit-spray.js';
import { artMeta, groundScale } from './visual-chuclong-assets.js';
import { BURN_EXIT, BURN_SIZE, burnFrame, FROST_DECAL_DIAMETER, FROST_EXIT, frostAlpha, MARK_GRACE } from './visual-chuclong-timeline.js';

type Frost = { layer: Layer; at: Vector3; remaining: number; touched: boolean; idle: number; reduced: boolean; cracked: boolean };
type Burn = { mesh?: Mesh; at: Vector3; remaining: number; age: number; touched: boolean; idle: number; reduced: boolean };
const MAX_MARKS = 24;

/**
 * State that outlives the hit, always from the snapshot (`frozen` ≤ 2.5 s, `burn` ≤ 4 s) and only on targets the tracker
 * tied to this caster's event. Never a zone: the server hits the whole zone, so only the individual target is marked.
 * - frost: a cold ground decal (shader, `ice` palette) under the frozen target; ice shards fly off in the last FROST_EXIT s
 *   (the body of the freeze itself is the shared freeze mark);
 * - burn: the Codex dragon-solar ring (P16: grow → loop → release) flat on the ground under the burning target (ground
 *   pass, so a crowd is never buried), with sparks that rise. A marker silent past MARK_GRACE ends at once and still plays
 *   its short exit; `remaining` drives the frame, so a re-mark never restarts the loop.
 */
export class ChuclongMarks {
  private frosts = new Map<string, Frost>();
  private burns = new Map<string, Burn>();
  private pool: LayerPool;

  constructor(scene: Scene, private art: KitPainted, private frost: KitSpray, private embers: KitSpray) {
    let serial = 0;
    this.pool = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitGround', 'ice', `chuclong-frost-${serial++}`);
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
      layer.material.setFloat('uSpiral', 0);
      return layer;
    }, MAX_MARKS, 'chuclong-frost');
  }

  markFrost(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    if (!Number.isFinite(remaining) || remaining <= 0 || !Number.isFinite(at.x) || !Number.isFinite(at.z)) return;
    let mark = this.frosts.get(id);
    if (!mark) {
      const layer = this.pool.acquire();
      if (!layer) { debug('visual.chuclong.cap', { layer: 'frost' }); return; }
      mark = { layer, at: at.clone(), remaining, touched: true, idle: 0, reduced, cracked: false };
      this.frosts.set(id, mark);
    }
    mark.touched = true; mark.idle = 0; mark.remaining = remaining; mark.reduced = reduced; mark.at.copyFrom(at);
  }

  markBurn(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    if (!Number.isFinite(remaining) || remaining <= 0 || !Number.isFinite(at.x) || !Number.isFinite(at.z)) return;
    let mark = this.burns.get(id);
    if (!mark) {
      if (this.burns.size >= MAX_MARKS) { debug('visual.chuclong.cap', { layer: 'burn' }); return; }
      mark = { mesh: this.art.acquire('burn', true), at: at.clone(), remaining, age: 0, touched: true, idle: 0, reduced };
      this.burns.set(id, mark);
    }
    mark.touched = true; mark.idle = 0; mark.remaining = remaining; mark.reduced = reduced; mark.at.copyFrom(at);
  }

  tick(dt: number, time: number): void {
    for (const [id, mark] of this.frosts) {
      if (mark.touched) mark.idle = 0; else mark.idle += dt;
      mark.touched = false;
      if (mark.idle > MARK_GRACE || mark.remaining <= 0) { this.endFrost(mark); this.frosts.delete(id); continue; }
      if (mark.remaining <= FROST_EXIT && !mark.cracked) this.crack(mark);
      const { mesh, material } = mark.layer;
      mesh.position.set(mark.at.x, .045, mark.at.z);
      mesh.scaling.set(FROST_DECAL_DIAMETER, 1, FROST_DECAL_DIAMETER);
      material.setFloat('uTime', mark.reduced ? 0 : time); material.setFloat('uAlpha', frostAlpha(mark.remaining) + .15);
      material.setFloat('uFill', .28); material.setFloat('uRim', .9); material.setFloat('uBand', 0);
      material.setFloat('uRings', 0); material.setFloat('uSwirl', 0);
    }
    for (const [id, mark] of this.burns) {
      if (mark.touched) mark.idle = 0; else mark.idle += dt;
      mark.touched = false; mark.age += dt;
      if (mark.idle > MARK_GRACE || mark.remaining <= 0) { this.art.release(mark.mesh); this.burns.delete(id); continue; }
      mark.mesh ??= this.art.acquire('burn', true);
      this.placeBurn(mark);
    }
  }

  clear(): void {
    this.frosts.clear(); this.pool.releaseAll();
    for (const mark of this.burns.values()) this.art.release(mark.mesh);
    this.burns.clear();
  }

  private placeBurn(mark: Burn): void {
    const { mesh } = mark, meta = artMeta('burn');
    if (!mesh || !meta) return;
    const scale = groundScale('burn', BURN_SIZE);
    mesh.scaling.set(scale.x, scale.y, 1);
    mesh.position.set(mark.at.x, .06, mark.at.z);
    this.art.frame(mesh, burnFrame(mark.age, mark.remaining, mark.reduced), meta.columns, meta.rows);
    mesh.visibility = Math.min(1, .2 + mark.remaining / BURN_EXIT * .8);
    if (!mark.reduced && Math.random() < .07) this.embers.rise(mark.at, 1.6, 2);
  }

  /** Ice splits in the last moments: shards fly off once (never in reduced motion). */
  private crack(mark: Frost): void {
    mark.cracked = true;
    if (!mark.reduced) { this.frost.ring(mark.at, 1.1, 10, 1, 3.5, 5); this.frost.rise(mark.at, 1.4, 6); }
  }

  /** An early end (the freeze broke, the target died or left the zone) still plays the crack, then frees the layer. */
  private endFrost(mark: Frost): void {
    if (!mark.cracked) this.crack(mark);
    this.pool.release(mark.layer);
  }
}
