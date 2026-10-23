import type { Scene } from '@babylonjs/core/scene.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPaletteName } from './visual-kit-palettes.js';
import { tier6Charge } from './visual-tier6-timeline.js';

type Charge = { body: Layer; rim: Layer; age: number; windup: number; reduced: boolean };

/** Shared charging mechanics; each hero supplies its own painted material/action silhouette. */
export class Tier6Charge {
  private pool: LayerPool;
  private entries = new Map<string | number, Charge>();
  private serial = 0;
  constructor(scene: Scene, private name: string, palette: KitPaletteName, private radius: number) {
    this.pool = new LayerPool(() => createGroundLayer(scene, 'kitGround', palette,
      `${name}-charge-${this.serial++}`), 16, `${name}-charge`);
  }
  cast(source: string | number, at: Vector3, windup: number, reduced: boolean): void {
    if (!source || !Number.isFinite(windup) || windup <= 0 || !Number.isFinite(at.x) || !Number.isFinite(at.z)) return;
    this.impact(source);
    const body = this.pool.acquire(), rim = this.pool.acquire();
    if (!body || !rim) {
      if (body) this.pool.release(body);
      if (rim) this.pool.release(rim);
      return;
    }
    for (const layer of [body, rim]) {
      layer.mesh.position.set(at.x, .055, at.z);
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
    }
    rim.mesh.scaling.setAll(Math.abs(this.radius) * 2);
    if (this.radius < 0) rim.mesh.setEnabled(false);
    this.entries.set(source, { body, rim, age: 0, windup, reduced });
    debug(`visual.${this.name}.charge`, { windup, radius: this.radius, reduced });
  }
  impact(source: string | number): void {
    const entry = this.entries.get(source);
    if (!entry) return;
    this.pool.release(entry.body); this.pool.release(entry.rim); this.entries.delete(source);
  }
  tick(dt: number, time: number): void {
    for (const [source, entry] of this.entries) {
      entry.age += dt;
      if (entry.age > entry.windup + 1) {
        debug(`visual.${this.name}.charge.cancel`, { reason: 'resolve-not-received' });
        this.impact(source); continue;
      }
      const pose = tier6Charge(entry.age, entry.windup, entry.reduced);
      entry.body.mesh.scaling.setAll(Math.abs(this.radius) * 2 * pose.scale);
      for (const layer of [entry.body, entry.rim]) {
        const rim = layer === entry.rim, m = layer.material;
        m.setFloat('uTime', entry.reduced ? 0 : time);
        m.setFloat('uAlpha', rim ? .35 + .4 * pose.power : pose.alpha);
        m.setFloat('uFill', rim ? 0 : .15 + .45 * pose.power);
        m.setFloat('uRim', rim ? .9 : .3); m.setFloat('uBand', 0);
        m.setFloat('uSwirl', entry.reduced ? 0 : -1.2 - pose.power);
        m.setFloat('uSpiral', rim || entry.reduced ? 0 : .4);
        m.setFloat('uRings', entry.reduced ? 0 : .4 + .6 * pose.power);
      }
    }
  }
  clear(): void { this.entries.clear(); this.pool.releaseAll(); }
}
