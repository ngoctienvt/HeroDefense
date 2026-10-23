import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import { cameraLook, placeStrip, resetStrip } from './visual-de-tuan-strip.js';
import type { PhanQuanArt } from './visual-phan-quan-art.js';
import { PQ_CAPS, bondAlpha, bondExit, shackleFrame } from './visual-phan-quan-timeline.js';
import layout from './visual-phan-quan-layout.json';
import { debug } from './debug.js';
type Pair = { from: Vector3; to: Vector3; remaining: number; age: number; missing: number; touched: boolean;
  reduced: boolean; opening: boolean; mesh?: Mesh; glow?: Layer };
type Shackle = { at: Vector3; remaining: number; age: number; missing: number; touched: boolean;
  reduced: boolean; opening: boolean; mesh?: Mesh };
export class PhanQuanLinks {
  private pairs = new Map<string, Pair>(); private shackles = new Map<string, Shackle>(); private glows: LayerPool;
  constructor(private scene: Scene, private pieces: PhanQuanArt) {
    let serial = 0;
    this.glows = new LayerPool(() => createGroundLayer(scene, 'kitLink', 'phanquan', `phan-quan-link-${serial++}`), PQ_CAPS.pairs, 'phan-quan-link');
  }
  markPair(id: string, from: Vector3, to: Vector3, remaining: number, reduced: boolean): void {
    let pair = this.pairs.get(id);
    if (!pair) {
      if (this.pairs.size >= PQ_CAPS.pairs) return;
      pair = { from: from.clone(), to: to.clone(), remaining, age: 0, missing: 0, touched: true, reduced,
        opening: remaining >= 3.75, glow: this.glows.acquire() }; this.pairs.set(id, pair);
      debug('visual.phan-quan.link.enter', { remaining, opening: pair.opening, reduced });
    }
    pair.from.copyFrom(from); pair.to.copyFrom(to); Object.assign(pair, { remaining, reduced, touched: true, missing: 0 });
  }
  markShackle(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    let shackle = this.shackles.get(id);
    if (!shackle) {
      if (this.shackles.size >= PQ_CAPS.shackles) return;
      shackle = { at: at.clone(), remaining, age: 0, missing: 0, touched: true, reduced, opening: remaining >= 3.75 };
      this.shackles.set(id, shackle);
    }
    shackle.at.copyFrom(at); Object.assign(shackle, { remaining, reduced, touched: true, missing: 0 });
  }
  tick(dt: number, time: number): void {
    for (const [id, pair] of this.pairs) {
      pair.age += dt; if (!pair.touched) pair.missing += dt; pair.touched = false;
      const alpha = bondAlpha(pair.remaining, pair.missing), exit = bondExit(pair.remaining, pair.missing);
      if (alpha <= 0) {
        this.releasePair(pair); this.pairs.delete(id); debug('visual.phan-quan.link.exit', { missing: pair.missing > 0 }); continue;
      }
      const delta = pair.to.subtract(pair.from); delta.y = 0; const length = delta.length();
      if (length < .03) { if (pair.mesh) pair.mesh.visibility = 0; if (pair.glow) pair.glow.mesh.visibility = 0; continue; }
      const dir = delta.scale(1 / length), draw = pair.opening && !pair.reduced ? Math.min(1, pair.age / .18) : 1;
      const reach = length * draw * (pair.reduced ? 1 : 1 - exit);
      pair.mesh ??= this.pieces.art.planes.acquire('chain'); if (pair.mesh) {
        this.pieces.art.crop(pair.mesh, 'chain');
        const head = pair.from.add(dir.scale(reach)).add(new Vector3(0, .3, 0));
        pair.mesh.visibility = placeStrip(pair.mesh, head, dir, cameraLook(this.scene), Math.max(.001, reach), .34) ? alpha : 0;
      }
      if (pair.glow) {
        const { mesh, material: m } = pair.glow;
        mesh.visibility = 1; mesh.position.set((pair.from.x + pair.to.x) / 2, .055, (pair.from.z + pair.to.z) / 2);
        mesh.scaling.set(length, 1, .13); mesh.rotation.y = -Math.atan2(dir.z, dir.x);
        m.setFloat('uHead', reach / length); m.setFloat('uTail', 0); m.setFloat('uWave', pair.reduced ? 0 : .25);
        m.setFloat('uTaper', 0); m.setFloat('uTime', pair.reduced ? 0 : time); m.setFloat('uAlpha', alpha * .45);
      }
    }
    for (const [id, node] of this.shackles) {
      node.age += dt; if (!node.touched) node.missing += dt; node.touched = false;
      const alpha = bondAlpha(node.remaining, node.missing), exit = bondExit(node.remaining, node.missing);
      if (alpha <= 0) { this.pieces.art.planes.release(node.mesh); this.shackles.delete(id); continue; }
      node.mesh ??= this.pieces.art.planes.acquire('shackle'); if (node.mesh) {
        const frame = shackleFrame(node.age, node.remaining, node.missing, node.opening, node.reduced);
        this.pieces.art.frame(node.mesh, 'shackle', Math.min(layout.shackle.frames - 1, frame));
        this.pieces.art.place(node.mesh, 'shackle', node.at, 1.65, undefined, node.reduced ? 0 : -.3 * exit);
        node.mesh.visibility = alpha;
      }
    }
  }
  private releasePair(pair: Pair): void {
    resetStrip(pair.mesh); this.pieces.art.planes.release(pair.mesh); if (pair.glow) this.glows.release(pair.glow);
  }
  clear(): void {
    for (const pair of this.pairs.values()) this.releasePair(pair);
    for (const node of this.shackles.values()) this.pieces.art.planes.release(node.mesh);
    this.pairs.clear(); this.shackles.clear(); this.glows.releaseAll();
  }
}
