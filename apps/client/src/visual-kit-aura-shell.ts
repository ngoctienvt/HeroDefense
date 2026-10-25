import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { actorAlphaIndex } from './visual-kit-depth.js';
import { createShellLayer, LayerPool, TouchedLayers } from './visual-kit-layers.js';
import type { KitPaletteName } from './visual-kit-palettes.js';
import { auraShellAlpha } from './visual-kit-recipe-timeline.js';

type ShellState = { since: number };

/**
 * Aura archetype, standing half: a fresnel shell kept around the caster while the snapshot marks it
 * (`mark` every frame), flashing on each aura pulse. The pulse ring itself is drawn by KitFxBank.
 * Drawn at `actorAlphaIndex - 1` so the hero billboard paints crisply over the shell's centre.
 */
export class KitAuraShell {
  private pool: LayerPool;
  private shells: TouchedLayers<ShellState>;
  private serial = 0;

  constructor(private scene: Scene, palette: KitPaletteName, cap: number, label: string) {
    this.pool = new LayerPool(() => createShellLayer(scene, palette, `${label}-${this.serial++}`, 16), cap, label);
    this.shells = new TouchedLayers(this.pool, () => ({ since: 9 }));
  }

  mark(id: string, at: Vector3): void {
    const entry = this.shells.touch(id);
    if (!entry) return;
    const { mesh } = entry.layer;
    mesh.position.set(at.x, .9, at.z);
    mesh.scaling.set(1.9, 1.5, 1.9);
    mesh.alphaIndex = actorAlphaIndex(this.scene, at.x, at.z) - 1;
  }

  /** An aura pulse landed for this caster: flash the shell. */
  pulse(id: string): void {
    const entry = this.shells.touch(id);
    if (entry) entry.state.since = 0;
  }

  tick(dt: number, time: number): void {
    this.shells.sweep((entry, touched) => {
      entry.state.since += dt;
      const m = entry.layer.material;
      m.setFloat('uTime', time);
      m.setFloat('uAlpha', auraShellAlpha(entry.state.since));
      return !touched;
    });
  }

  clear(): void {
    this.shells.clear();
    this.pool.releaseAll();
  }
}
