import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { LayerPool, type Layer } from './visual-kit-layers.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { stormLayer } from './visual-loi-chan-tu-charge.js';
import type { StormArt } from './visual-loi-chan-tu-art.js';
import { LC_CAPS, STORM_CLOSE, stormPose } from './visual-loi-chan-tu-timeline.js';
import { debug } from './debug.js';
interface Storm { at: Vector3; radius: number; remaining: number; reduced: boolean; touched: boolean; close?: number; warning?: Mesh; cloud?: Mesh; border?: Layer }
/** A warning-only targeting region, not a persistent electrical damage field. Snapshot owns its lifetime. */
export class StormBarrage {
  private entries = new Map<string, Storm>(); private pool: LayerPool;
  constructor(scene: Scene, private art: StormArt) {
    let serial = 0; this.pool = new LayerPool(() => stormLayer(scene, `storm-border-${serial++}`), LC_CAPS.barrage, 'storm-border');
  }
  mark(id: string, at: Vector3, radius: number, remaining: number, reduced: boolean): void {
    if (!id || ![at.x, at.y, at.z, radius, remaining].every(Number.isFinite) || radius <= 0 || radius > 64 || remaining <= 0) return;
    let p = this.entries.get(id);
    if (!p) { if (this.entries.size >= LC_CAPS.barrage) return;
      p = { at: at.clone(), radius, remaining, reduced, touched: true }; this.entries.set(id, p);
      debug('visual.loi-chan-tu.barrage.seen', { radius, remaining, reduced }); }
    p.at.copyFrom(at); p.radius = radius; p.remaining = remaining; p.reduced = reduced; p.touched = true; p.close = undefined;
  }
  tick(dt: number, time: number): void {
    for (const [id, p] of this.entries) {
      if (!p.touched && p.close === undefined) { p.close = 0; if (p.border) this.pool.release(p.border); p.border = undefined;
        debug('visual.loi-chan-tu.barrage.close', {}); }
      if (p.close !== undefined) p.close += dt;
      if (p.close !== undefined && p.close >= STORM_CLOSE) { this.release(p); this.entries.delete(id); continue; }
      const state = stormPose(p.remaining, p.close, p.reduced); p.touched = false;
      p.warning ??= this.art.paint.planes.acquire('warning', true);
      if (p.warning) { this.art.paint.ground(p.warning, 'warning', p.at, p.radius * state.scale); p.warning.visibility = state.alpha * .52; }
      p.cloud ??= this.art.paint.planes.acquire('cloud');
      if (p.cloud) { this.art.paint.frame(p.cloud, 'cloud', state.frame); this.art.paint.place(p.cloud, 'cloud', p.at, p.radius * 1.8 * state.scale, undefined, state.lift); p.cloud.visibility = state.alpha; }
      if (state.border) {
        p.border ??= this.pool.acquire();
        if (p.border) {
          const { mesh, material: m } = p.border; mesh.position.set(p.at.x, .048, p.at.z); mesh.scaling.set(p.radius * 2, 1, p.radius * 2); mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
          m.setFloat('uTime', p.reduced ? 0 : time); m.setFloat('uAlpha', .32); m.setFloat('uFill', 0); m.setFloat('uRim', 1);
          m.setFloat('uBand', 1); m.setFloat('uRings', 0); m.setFloat('uSpiral', 0); m.setFloat('uSwirl', 0);
        }
      }
    }
  }
  private release(p: Storm): void { this.art.paint.planes.release(p.warning); this.art.paint.planes.release(p.cloud); if (p.border) this.pool.release(p.border); }
  clear(): void { for (const p of this.entries.values()) this.release(p); this.entries.clear(); this.pool.releaseAll(); }
}
