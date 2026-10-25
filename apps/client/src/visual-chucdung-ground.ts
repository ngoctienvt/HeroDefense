import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { CHUCDUNG as C } from '../../../content/chucdung-design.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, TouchedLayers } from './visual-kit-layers.js';
import type { KitSpray } from './visual-kit-spray.js';
import { EMBER_FADE, LAVA_FADE, poolAlpha, poolSpread } from './visual-chucdung-timeline.js';

const MAX_POOLS = 20;
/** Chance per second that a lava pool throws one spark; kept low so crowds stay inside the spray budget. */
const SPARKS_PER_SECOND = 7;

type PoolState = { age: number; ember: boolean; reduced: boolean };

/**
 * Snapshot-driven ground effects: the 5s lava sea (`chucdung-lava`, radius C.lavaRadius) and the 5s embers
 * left under every basic strike (`chucdung-ember`, radius C.splashRadius). Both are drawn before every actor.
 * The snapshot has no remaining time, so age is counted from the first marked frame.
 */
export class ChucdungGround {
  private pool: LayerPool;
  private pools: TouchedLayers<PoolState>;
  private serial = 0;

  constructor(scene: Scene, private spray: KitSpray) {
    this.pool = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'lava', `chucdung-pool-${this.serial++}`),
      MAX_POOLS, 'chucdung-pool');
    this.pools = new TouchedLayers(this.pool, () => ({ age: 0, ember: false, reduced: false }));
  }

  /** `kind` is `lava` or `ember`; called every frame the ground effect exists. */
  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    const entry = this.pools.touch(id);
    if (!entry) return;
    entry.state.ember = kind === 'ember';
    entry.state.reduced = reduced;
    const { mesh } = entry.layer;
    mesh.position.set(at.x, .045, at.z);
    // Lava under embers, both under every actor.
    mesh.alphaIndex = GROUND_ALPHA_INDEX + (entry.state.ember ? 7 : 6);
  }

  tick(dt: number, time: number): void {
    this.pools.sweep((entry, touched) => {
      const { layer, state } = entry;
      state.age += dt;
      const total = state.ember ? C.emberSeconds : C.lavaSeconds;
      const radius = state.ember ? C.splashRadius : C.lavaRadius;
      const spread = state.reduced ? 1 : poolSpread(state.age);
      layer.mesh.scaling.setAll(radius * 2 * (.2 + .8 * spread));
      const m = layer.material;
      m.setFloat('uTime', time);
      m.setFloat('uAlpha', poolAlpha(state.age, total, state.ember ? EMBER_FADE : LAVA_FADE) * (state.ember ? .8 : .95));
      m.setFloat('uFill', state.ember ? .7 : .98);
      m.setFloat('uRim', state.ember ? .6 : 1);
      // Lava barely swirls: keep only a faint current so it reads as molten rock, not whirlpool water.
      m.setFloat('uBand', 0); m.setFloat('uRings', 0); m.setFloat('uSpiral', state.ember ? 0 : .2);
      m.setFloat('uSwirl', state.reduced ? 0 : state.ember ? .15 : .3);
      if (touched && !state.reduced && !state.ember && Math.random() < dt * SPARKS_PER_SECOND) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radius * .85;
        const mesh = layer.mesh.position;
        this.spray.trail(new Vector3(mesh.x + Math.cos(a) * r, .2, mesh.z + Math.sin(a) * r),
          new Vector3(0, 3 + Math.random() * 2, 0), 1);
      }
      return !touched;
    });
  }

  clear(): void {
    this.pools.clear();
    this.pool.releaseAll();
  }
}
