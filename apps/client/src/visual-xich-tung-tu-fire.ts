import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { farDirection } from './visual-kit-billboard.js';
import type { DewArt } from './visual-xich-tung-tu-art.js';
import { XT_CAPS, FIRE_CLOSE } from './visual-xich-tung-tu-timeline.js';
import { debug } from './debug.js';
interface Fire { at: Vector3; remaining: number; reduced: boolean; touched: boolean; close?: number; mesh?: Mesh }
export class DewFire {
  private entries = new Map<string, Fire>();
  constructor(private scene: Scene, private art: DewArt) {}
  mark(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    if (!id || ![at.x, at.y, at.z, remaining].every(Number.isFinite) || remaining <= 0) return;
    let p = this.entries.get(id); if (!p) { if (this.entries.size >= XT_CAPS.fire) return;
      p = { at: at.clone(), remaining, reduced, touched: true }; this.entries.set(id, p); debug('visual.xich-tung-tu.fire.seen', { remaining, reduced }); }
    p.at.copyFrom(at); p.remaining = remaining; p.reduced = reduced; p.touched = true; p.close = undefined;
  }
  tick(dt: number): void {
    const far = farDirection(this.scene), right = new Vector3(-far.z, 0, far.x);
    for (const [id, p] of this.entries) {
      if (!p.touched && p.close === undefined) { p.close = 0; debug('visual.xich-tung-tu.fire.extinguish', {}); }
      if (p.close !== undefined) p.close += dt;
      if (p.close !== undefined && p.close >= FIRE_CLOSE) { this.art.paint.planes.release(p.mesh); this.entries.delete(id); continue; }
      p.touched = false; p.mesh ??= this.art.paint.planes.acquire('fire'); if (!p.mesh) continue;
      const fold = p.reduced || p.close === undefined ? 0 : Math.min(1, p.close / FIRE_CLOSE);
      const frame = p.reduced ? 4 : p.close === undefined ? Math.floor(Math.max(0, 5 - p.remaining) / .09) % 12 : 12 + Math.min(3, Math.floor(p.close / FIRE_CLOSE * 4));
      this.art.paint.frame(p.mesh, 'fire', frame);
      this.art.paint.place(p.mesh, 'fire', p.at.add(right.scale(.58 - .3 * fold)), .78 * (1 - .7 * fold), .95 * (1 - .7 * fold), .85);
      p.mesh.rotation.z = fold * 1.3; p.mesh.visibility = p.close === undefined ? .9 : .9 * (1 - p.close / FIRE_CLOSE);
    }
  }
  clear(): void { for (const p of this.entries.values()) this.art.paint.planes.release(p.mesh); this.entries.clear(); }
}
