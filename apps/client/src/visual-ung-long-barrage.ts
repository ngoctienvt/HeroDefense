import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { LayerPool, type Layer } from './visual-kit-layers.js';
import type { BlizzardArt } from './visual-ung-long-art.js';
import { frostLayer } from './visual-ung-long-charge.js';
import { UL_CAPS, BLIZZARD_CLOSE, blizzardPose } from './visual-ung-long-timeline.js';
import { debug } from './debug.js';
interface Blizzard { at: Vector3; radius: number; remaining: number; reduced: boolean; touched: boolean; close?: number; ground?: Mesh; vortex?: Mesh; border?: Layer }
export class BlizzardBarrage {
  private entries = new Map<string, Blizzard>(); private pool: LayerPool;
  constructor(scene: Scene, private art: BlizzardArt) { let i = 0; this.pool = new LayerPool(() => frostLayer(scene, `blizzard-border-${i++}`), UL_CAPS.barrage, 'blizzard-border'); }
  mark(id: string, at: Vector3, radius: number, remaining: number, reduced: boolean): void {
    if (!id || ![at.x, at.y, at.z, radius, remaining].every(Number.isFinite) || radius <= 0 || radius > 64 || remaining <= 0) return;
    let p = this.entries.get(id); if (!p) { if (this.entries.size >= UL_CAPS.barrage) return;
      p = { at: at.clone(), radius, remaining, reduced, touched: true }; this.entries.set(id, p); debug('visual.ung-long.barrage.seen', { radius, remaining, reduced }); }
    p.at.copyFrom(at); p.radius = radius; p.remaining = remaining; p.reduced = reduced; p.touched = true; p.close = undefined;
  }
  tick(dt: number, time: number): void {
    for (const [id, p] of this.entries) {
      if (!p.touched && p.close === undefined) { p.close = 0; if (p.border) this.pool.release(p.border); p.border = undefined; debug('visual.ung-long.barrage.collapse', {}); }
      if (p.close !== undefined) p.close += dt;
      if (p.close !== undefined && p.close >= BLIZZARD_CLOSE) { this.release(p); this.entries.delete(id); continue; }
      p.touched = false; const s = blizzardPose(p.remaining, p.close, p.reduced);
      p.ground ??= this.art.paint.planes.acquire('ground', true);
      if (p.ground) { this.art.paint.ground(p.ground, 'ground', p.at, p.radius * s.scale, s.turn); p.ground.visibility = s.alpha * .55; }
      p.vortex ??= this.art.paint.planes.acquire('vortex');
      if (p.vortex) { this.art.paint.frame(p.vortex, 'vortex', s.frame); this.art.paint.place(p.vortex, 'vortex', p.at, p.radius * 1.5 * s.scale, p.radius * 1.5 * s.scale, s.lift); p.vortex.rotation.z = s.turn * .18; p.vortex.visibility = s.alpha; }
      if (p.close === undefined) { p.border ??= this.pool.acquire();
        if (p.border) { const { mesh, material: m } = p.border; mesh.position.set(p.at.x, .048, p.at.z); mesh.scaling.set(p.radius * 2, 1, p.radius * 2);
          m.setFloat('uTime', p.reduced ? 0 : time); m.setFloat('uAlpha', .25); m.setFloat('uFill', 0); m.setFloat('uRim', 1);
          m.setFloat('uBand', 1); m.setFloat('uRings', 0); m.setFloat('uSpiral', 0); m.setFloat('uSwirl', 0); } }
    }
  }
  private release(p: Blizzard): void { this.art.paint.planes.release(p.ground); this.art.paint.planes.release(p.vortex); if (p.border) this.pool.release(p.border); }
  clear(): void { for (const p of this.entries.values()) this.release(p); this.entries.clear(); this.pool.releaseAll(); }
}
