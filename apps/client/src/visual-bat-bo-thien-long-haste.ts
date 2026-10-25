import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { farDirection } from './visual-kit-billboard.js';
import type { DragonArt } from './visual-bat-bo-thien-long-art.js';
import { BT_CAPS, HASTE_CLOSE } from './visual-bat-bo-thien-long-timeline.js';
import { debug } from './debug.js';
interface Haste { at: Vector3; remaining: number; reduced: boolean; touched: boolean; close?: number; mesh?: Mesh }
export class DragonHaste {
  private entries = new Map<string, Haste>();
  constructor(private scene: Scene, private art: DragonArt) {}
  mark(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    if (!id || ![at.x, at.y, at.z, remaining].every(Number.isFinite) || remaining <= 0) return;
    let p = this.entries.get(id); if (!p) { if (this.entries.size >= BT_CAPS.haste) return; p = { at: at.clone(), remaining, reduced, touched: true }; this.entries.set(id, p); debug('visual.bat-bo-thien-long.haste.seen', { remaining, reduced }); }
    p.at.copyFrom(at); p.remaining = remaining; p.reduced = reduced; p.touched = true; p.close = undefined;
  }
  tick(dt: number): void {
    const far = farDirection(this.scene), right = new Vector3(-far.z, 0, far.x);
    for (const [id, p] of this.entries) {
      if (!p.touched && p.close === undefined) { p.close = 0; debug('visual.bat-bo-thien-long.haste.coil', {}); }
      if (p.close !== undefined) p.close += dt;
      if (p.close !== undefined && p.close >= HASTE_CLOSE) { this.art.paint.planes.release(p.mesh); this.entries.delete(id); continue; }
      p.touched = false; p.mesh ??= this.art.paint.planes.acquire('haste'); if (!p.mesh) continue;
      const fold = p.reduced || p.close === undefined ? 0 : Math.min(1, p.close / HASTE_CLOSE);
      this.art.paint.frame(p.mesh, 'haste', p.reduced ? 1 : Math.floor(Math.max(0, 4 - p.remaining) / .16) % 3);
      this.art.paint.place(p.mesh, 'haste', p.at.add(right.scale(-.58 + fold * .3)).add(far.scale(.1)), .95 * (1 - fold * .8), .95 * (1 - fold * .8), 1.1);
      p.mesh.rotation.z = -fold * 1.4; p.mesh.visibility = p.close === undefined ? .75 : .75 * (1 - p.close / HASTE_CLOSE);
    }
  }
  clear(): void { for (const p of this.entries.values()) this.art.paint.planes.release(p.mesh); this.entries.clear(); }
}
