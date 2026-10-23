import type { Scene } from '@babylonjs/core/scene.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, TouchedLayers } from './visual-kit-layers.js';
import type { KitPaletteName } from './visual-kit-palettes.js';

/** Gameplay border stays fixed while the material inside it settles and closes. */
export class Tier6Area {
  private pool: LayerPool;
  private markers: TouchedLayers<{ reduced: boolean }>;
  private serial = 0;
  constructor(scene: Scene, name: string, palette: KitPaletteName) {
    this.pool = new LayerPool(() => createGroundLayer(scene, 'kitGround', palette,
      `${name}-area-${this.serial++}`), 8, `${name}-area`);
    this.markers = new TouchedLayers(this.pool, () => ({ reduced: false }));
  }
  mark(id: string, at: Vector3, radius: number, remaining: number, reduced: boolean): void {
    if (![at.x, at.z, radius, remaining].every(Number.isFinite) || radius <= 0 || remaining <= 0) return;
    const entry = this.markers.touch(id);
    if (!entry) return;
    entry.state.reduced = reduced;
    entry.layer.mesh.position.set(at.x, .045, at.z);
    entry.layer.mesh.scaling.setAll(radius * 2);
    entry.layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 6;
    const m = entry.layer.material;
    m.setFloat('uAlpha', .48); m.setFloat('uFill', 0); m.setFloat('uRim', 1);
    m.setFloat('uBand', 0); m.setFloat('uSpiral', 0); m.setFloat('uRings', 0); m.setFloat('uSwirl', 0);
  }
  tick(_dt: number, time: number): void {
    this.markers.sweep((entry, touched) => {
      entry.layer.material.setFloat('uTime', entry.state.reduced ? 0 : time);
      return !touched;
    });
  }
  clear(): void { this.markers.clear(); this.pool.releaseAll(); }
}
