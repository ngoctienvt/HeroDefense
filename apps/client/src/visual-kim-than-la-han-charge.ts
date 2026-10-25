import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { LayerPool, createShellLayer, type Layer } from './visual-kit-layers.js';
import { farDirection, screenUp } from './visual-kit-billboard.js';
import type { CompassionArt } from './visual-kim-than-la-han-art.js';
import type { RelicBeads } from './visual-kim-than-la-han-beads.js';
import { KH_CAPS, relicCharge } from './visual-kim-than-la-han-timeline.js';
interface Charge { at: Vector3; age: number; windup: number; reduced: boolean; closing: boolean; beads: (Mesh | undefined)[]; flare?: Mesh; layer?: Layer }
export class RelicCharge {
  private entries = new Map<string, Charge>(); private pool: LayerPool;
  constructor(private scene: Scene, private art: CompassionArt, private relics: RelicBeads) { let i = 0; this.pool = new LayerPool(() => createShellLayer(scene, 'gold', `sarira-charge-${i++}`, 12), KH_CAPS.casts, 'sarira-charge'); }
  begin(id: string, at: Vector3, windup: number, reduced: boolean): void { this.cancel(id); if (this.entries.size < KH_CAPS.casts) this.entries.set(id, { at: at.clone(), windup, age: 0, reduced, closing: false, beads: [] }); }
  resolve(id: string, at: Vector3 | undefined, reduced: boolean): void { this.cancel(id); if (at && this.entries.size < KH_CAPS.casts) this.entries.set(id, { at: at.clone(), windup: .25, age: 0, reduced, closing: true, beads: [] }); }
  cancel(id: string): void { const p = this.entries.get(id); if (p) { for (const mesh of p.beads) this.relics.release(mesh); this.art.paint.planes.release(p.flare); if (p.layer) this.pool.release(p.layer); } this.entries.delete(id); }
  tick(dt: number, time: number): void {
    const far = farDirection(this.scene), right = new Vector3(-far.z, 0, far.x), up = screenUp(this.scene);
    for (const [id, p] of this.entries) {
      p.age += dt; if (p.age > (p.closing ? .36 : p.windup + .3)) { this.cancel(id); continue; }
      const s = relicCharge(p.age, p.windup, p.reduced), fold = p.reduced || !p.closing ? 0 : Math.min(1, p.age / .36), alpha = p.closing ? .8 * (1 - p.age / .36) : s.alpha;
      for (let j = 0; j < 9; j++) { p.beads[j] ??= this.relics.acquire(); const mesh = p.beads[j]; if (!mesh) continue;
        const angle = j * Math.PI * 2 / 9 + (p.reduced ? 0 : time * 1.5), radius = (.65 + .2 * s.scale) * (1 - fold * .75);
        const at = p.at.add(up.scale(1.45 + Math.sin(angle) * radius * .6)).add(right.scale(Math.cos(angle) * radius)).add(far.scale(Math.sin(angle) * .2));
        this.relics.place(mesh, at, .23 * s.scale * (1 - fold * .65), alpha); }
      p.flare ??= this.art.paint.planes.acquire('cast'); if (p.flare) {
        this.art.paint.frame(p.flare, 'cast', p.reduced ? 2 : p.closing ? Math.min(7, 4 + Math.floor(p.age / .36 * 4)) : s.frame);
        this.art.paint.place(p.flare, 'cast', p.at, 2 * s.scale * (1 - fold * .6), 2 * s.scale, 1.5); p.flare.visibility = alpha * .55; }
      if (!p.closing) { p.layer ??= this.pool.acquire(); if (p.layer) { const { mesh, material: m } = p.layer;
        mesh.position.copyFrom(p.at.add(up.scale(1.45))); mesh.scaling.setAll(.75 * s.scale);
        m.setFloat('uTime', p.reduced ? 0 : time); m.setFloat('uAlpha', s.alpha * .22); m.setFloat('uFill', s.fill); m.setFloat('uRim', .3); } }
    }
  }
  clear(): void { for (const id of [...this.entries.keys()]) this.cancel(id); this.pool.releaseAll(); this.relics.clear(); }
}
