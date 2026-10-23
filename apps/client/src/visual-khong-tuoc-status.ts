import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { KhongTuocArt } from './visual-khong-tuoc-art.js';
import { EXIT_TIME, plumeFrame } from './visual-khong-tuoc-timeline.js';
import { debug } from './debug.js';

interface Plume { at: Vector3; remaining: number; age: number; touched: boolean; missed: number;
  exit?: number; reduced: boolean; meshes: (Mesh | undefined)[] }
/** One pair of low hand/weapon plumes per actual poison tierBuff. Refreshing markers never resets age. */
export class KhongTuocStatus {
  private live = new Map<string, Plume>();
  constructor(private art: KhongTuocArt) {}
  mark(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    if (!Number.isFinite(remaining) || remaining <= 0 || ![at.x, at.y, at.z].every(Number.isFinite)) return;
    let p = this.live.get(id);
    if (!p) {
      if (this.live.size >= 48) return;
      p = { at: at.clone(), remaining, age: .28, touched: true, missed: 0, reduced, meshes: [undefined, undefined] };
      this.live.set(id, p); debug('visual.khong-tuoc.plume.begin', { remaining, active: this.live.size });
    }
    p.at.copyFrom(at); p.remaining = remaining; p.reduced = reduced; p.touched = true; p.missed = 0;
    if (remaining > .4) p.exit = undefined;
    this.acquireMissing(p);
  }
  private acquireMissing(p: Plume): void {
    if (p.exit !== undefined) return;
    for (let i = 0; i < 2; i++) p.meshes[i] ??= this.art.planes.acquire('aura');
  }
  tick(dt: number): void {
    for (const [id, p] of this.live) {
      p.age += dt; p.remaining = Math.max(0, p.remaining - dt);
      p.missed = p.touched ? 0 : p.missed + dt; p.touched = false;
      if (p.exit === undefined && (p.remaining <= EXIT_TIME || p.missed > .12)) {
        p.exit = 0; debug('visual.khong-tuoc.plume.exit', { remaining: p.remaining });
      }
      if (p.exit !== undefined) p.exit += dt;
      if ((p.exit ?? 0) >= EXIT_TIME) { for (const mesh of p.meshes) this.art.planes.release(mesh); this.live.delete(id); continue; }
      const fold = p.reduced ? 0 : (p.exit ?? 0) / EXIT_TIME;
      this.acquireMissing(p);
      p.meshes.forEach((mesh, side) => {
        if (!mesh) return;
        const at = p.at.add(new Vector3((side ? 1 : -1) * (1.15 - fold * .6), 0, 0));
        this.art.frame(mesh, 'aura', plumeFrame(p.age, p.exit, p.reduced));
        this.art.place(mesh, 'aura', at, 2.45 * (1 - fold * .45), 2.45, 1.65 - fold * 1.1);
        mesh.rotation.z = (side ? -1 : 1) * fold * .65;
        mesh.visibility = p.exit === undefined ? .8 : .8 * (1 - p.exit / EXIT_TIME);
      });
    }
  }
  clear(): void { for (const p of this.live.values()) for (const mesh of p.meshes) this.art.planes.release(mesh); this.live.clear(); }
}
