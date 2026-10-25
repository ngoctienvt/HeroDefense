import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { DharmaArt } from './visual-duong-tang-art.js';
import { DT_CAPS, GROUND_CLOSE, groundPose } from './visual-duong-tang-timeline.js';
import { debug } from './debug.js';
interface Ground { at: Vector3; radius: number; remaining: number; reduced: boolean; touched: boolean; close?: number; dharma?: Mesh; bells: (Mesh | undefined)[]; border?: Layer }
/** Only server tier-gold snapshot markers keep the region alive; no resolve-side lifetime guess. */
export class DharmaGround {
  private entries = new Map<string, Ground>(); private pool: LayerPool;
  constructor(scene: Scene, private art: DharmaArt) {
    let serial = 0; this.pool = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'gold', `dharma-boundary-${serial++}`), DT_CAPS.grounds, 'dharma-boundary');
  }
  mark(id: string, at: Vector3, radius: number, remaining: number, reduced: boolean): void {
    if (!id || ![at.x, at.y, at.z, radius, remaining].every(Number.isFinite) || radius <= 0 || radius > 64 || remaining <= 0) return;
    let p = this.entries.get(id);
    if (!p) {
      if (this.entries.size >= DT_CAPS.grounds) return;
      p = { at: at.clone(), radius, remaining, reduced, touched: true, bells: [] }; this.entries.set(id, p);
      debug('visual.duong-tang.ground.seen', { radius, remaining, reduced });
    }
    p.at.copyFrom(at); p.radius = radius; p.remaining = remaining; p.reduced = reduced; p.touched = true; p.close = undefined;
  }
  tick(dt: number, time: number): void {
    for (const [id, p] of this.entries) {
      if (!p.touched && p.close === undefined) {
        p.close = 0; if (p.border) this.pool.release(p.border); p.border = undefined;
        this.art.closeFillet(p.at, p.reduced, p.radius); debug('visual.duong-tang.ground.close', { radius: p.radius });
      }
      if (p.close !== undefined) p.close += dt;
      if (p.close !== undefined && p.close >= GROUND_CLOSE) { this.release(p); this.entries.delete(id); continue; }
      const state = groundPose(p.remaining, p.close, p.reduced); p.touched = false;
      p.dharma ??= this.art.paint.planes.acquire('dharma', true);
      if (p.dharma) { this.art.paint.ground(p.dharma, 'dharma', p.at, p.radius * state.scale); p.dharma.visibility = state.alpha; }
      if (state.border) {
        p.border ??= this.pool.acquire();
        if (p.border) {
          const { mesh, material: m } = p.border; mesh.position.set(p.at.x, .048, p.at.z); mesh.scaling.set(p.radius * 2, 1, p.radius * 2); mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
          m.setFloat('uTime', p.reduced ? 0 : time); m.setFloat('uAlpha', .42); m.setFloat('uFill', 0); m.setFloat('uRim', 1);
          m.setFloat('uBand', 1); m.setFloat('uRings', 0); m.setFloat('uSpiral', 0); m.setFloat('uSwirl', 0);
        }
      }
      for (let i = 0; i < 2; i++) {
        p.bells[i] ??= this.art.paint.planes.acquire('bell'); const bell = p.bells[i]; if (!bell) continue;
        const center = p.at.add(new Vector3((i ? -.3 : .3) * p.radius, .07, (i ? .2 : -.2) * p.radius));
        this.art.paint.frame(bell, 'bell', p.reduced ? 3 : (state.bellFrame + i * 4) % 8);
        // Source is already a 42-degree ellipse: world billboard keeps one projection, not a double-flattened decal.
        this.art.paint.place(bell, 'bell', center, Math.min(3, p.radius * .65) * state.scale); bell.visibility = state.alpha * .72;
      }
    }
  }
  private release(p: Ground): void {
    this.art.paint.planes.release(p.dharma); for (const bell of p.bells) this.art.paint.planes.release(bell); if (p.border) this.pool.release(p.border);
  }
  clear(): void { for (const p of this.entries.values()) this.release(p); this.entries.clear(); this.pool.releaseAll(); }
}
