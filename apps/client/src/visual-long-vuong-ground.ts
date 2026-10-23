import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { LongVuongArt } from './visual-long-vuong-art.js';
import { DRAIN_SECONDS, waterPool } from './visual-long-vuong-timeline.js';

type Pool = { at: Vector3; radius: number; remaining: number; age: number; touched: boolean; reduced: boolean;
  exitAge?: number;
  floor: Layer; decal?: Mesh; foam: (Mesh | undefined)[] };
/** No four-second reset on join/reconnect; only the snapshot decides whether this water still exists. */
export class LongVuongGround {
  private layers: LayerPool;
  private pools = new Map<string, Pool>();
  constructor(scene: Scene, private art: LongVuongArt) {
    let serial = 0;
    this.layers = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'longvuong', `long-vuong-pool-${serial++}`), 8, 'long-vuong-pool');
  }
  mark(id: string, at: Vector3, radius: number, remaining: number, reduced: boolean): void {
    if (![at.x, at.z, radius, remaining].every(Number.isFinite) || radius <= 0 || remaining <= 0) return;
    let pool = this.pools.get(id);
    if (!pool) {
      const floor = this.layers.acquire(); if (!floor) return;
      pool = { at: at.clone(), radius, remaining, reduced, floor, touched: true, age: 0, foam: [] };
      this.pools.set(id, pool);
      debug('visual.long-vuong.pool', { radius, remaining, reduced });
    }
    Object.assign(pool, { radius, remaining, reduced, touched: true, exitAge: undefined }); pool.at.copyFrom(at);
  }
  tick(dt: number, time: number): void {
    for (const [id, pool] of this.pools) {
      if (!pool.touched) {
        if (pool.exitAge === undefined) {
          pool.exitAge = 0;
          debug('visual.long-vuong.pool.exit', { remaining: pool.remaining, reduced: pool.reduced });
        }
        pool.exitAge += dt;
        const exitSeconds = pool.reduced ? .1 : .2;
        if (pool.exitAge >= exitSeconds) { this.free(pool); this.pools.delete(id); continue; }
      }
      pool.touched = false; pool.age += dt;
      const exitAge = pool.exitAge, exiting = exitAge !== undefined;
      const remaining = exitAge === undefined ? pool.remaining : Math.min(pool.remaining, DRAIN_SECONDS)
        * Math.max(0, 1 - exitAge / (pool.reduced ? .1 : .2));
      const pose = waterPool(remaining, pool.reduced), size = pool.radius * 2 * (exiting ? pose.scale : 1);
      const { mesh, material: m } = pool.floor;
      mesh.alphaIndex = GROUND_ALPHA_INDEX + 1;
      mesh.position.set(pool.at.x, .035, pool.at.z); mesh.scaling.setAll(size);
      m.setFloat('uTime', pool.reduced ? 0 : time); m.setFloat('uAlpha', .48 * pose.alpha);
      // The water drains inside the boundary; R remains truthful until the server removes the zone.
      m.setFloat('uFill', .65 * (1 - pose.drain)); m.setFloat('uRim', exiting ? 0 : .65); m.setFloat('uBand', 0);
      m.setFloat('uSwirl', pool.reduced ? 0 : 1 + pose.drain * 3);
      m.setFloat('uRings', .2); m.setFloat('uSpiral', pool.reduced ? 0 : .5 + pose.drain);
      pool.decal ??= this.art.planes.acquire('pool', true);
      if (pool.decal) {
        pool.decal.position.set(pool.at.x, .05, pool.at.z);
        pool.decal.scaling.set(this.art.poolDiameter(pool.radius) * pose.scale, this.art.poolDiameter(pool.radius) * pose.scale, 1);
        pool.decal.rotation.set(Math.PI / 2, pose.spin, 0); pool.decal.visibility = .78 * pose.alpha;
      }
      for (let k = 0; k < 3; k++) {
        pool.foam[k] ??= this.art.planes.acquire('churn', true);
        const foam = pool.foam[k]; if (!foam) continue;
        const angle = (k === 1 ? 1.1 : 3.5) + pose.spin;
        const radius = k === 0 ? 0 : pool.radius * .52 * pose.scale;
        const at = pool.at.add(new Vector3(Math.cos(angle) * radius, .07, Math.sin(angle) * radius));
        this.art.frame(foam, 'churn', pool.reduced ? 2 : (Math.floor(pool.age * 11) + k * 2) % 8);
        foam.position.copyFrom(at);
        const diameter = pool.radius * (k === 0 ? 1.05 : .42) * pose.scale;
        foam.scaling.set(diameter, diameter, 1);
        foam.rotation.set(Math.PI / 2, angle, 0);
        foam.visibility = .74 * pose.alpha;
      }
    }
  }
  private free(pool: Pool): void {
    this.layers.release(pool.floor); this.art.planes.release(pool.decal);
    for (const foam of pool.foam) this.art.planes.release(foam);
  }
  clear(): void { for (const pool of this.pools.values()) this.free(pool); this.pools.clear(); }
}
