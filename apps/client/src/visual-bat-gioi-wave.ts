import type { Scene } from '@babylonjs/core/scene.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Constants } from '@babylonjs/core/Engines/constants.js';
import { createLoftedRingLayer, LayerPool, type Layer, type RingProfile } from './visual-kit-layers.js';
import { COMBAT_DRAW_GROUP, configureCombatDrawOrder } from './visual-kit-draw-order.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { RUPTURE_SECONDS, TIDE_SECONDS, tideWave } from './visual-bat-gioi-timeline.js';

// Rolled lip and hollow underside, rather than a vertical cylinder or flat expanding disc.
const STANDING: RingProfile = [[-.85, 0], [-.65, .2], [-.4, .65], [-.12, 1], [.22, 1.12],
  [.55, 1.02], [.7, .8], [.48, .65], [.2, .7], [.06, .38], [.22, 0]];
const CRASHED: RingProfile = [[-.85, 0], [-.6, .08], [-.3, .15], [0, .2], [.4, .24],
  [.8, .2], [1, .12], [.8, .08], [.5, .07], [.2, .03], [.22, 0]];
type Wave = { layer: Layer; age: number; rupture: boolean };

export class BatGioiWave {
  private pool: LayerPool;
  private waves: Wave[] = [];
  constructor(scene: Scene) {
    configureCombatDrawOrder(scene); let serial = 0;
    this.pool = new LayerPool(() => {
      const layer = createLoftedRingLayer(scene, 'batgioi', `bat-gioi-tide-${serial++}`, 5, STANDING, CRASHED, 72);
      layer.mesh.renderingGroupId = COMBAT_DRAW_GROUP.skill;
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 5;
      layer.material.depthFunction = Constants.ALWAYS;
      return layer;
    }, 8, 'bat-gioi-tide');
  }
  start(at: Vector3, rupture: boolean, reduced: boolean): void {
    // The painted static pose remains the reduced-motion cue, with no travelling wave mesh.
    if (reduced) return;
    const layer = this.pool.acquire(); if (!layer) return;
    layer.mesh.position.set(at.x, .045, at.z);
    layer.material.setFloat('uAlpha', 0);
    this.waves.push({ layer, age: 0, rupture });
  }
  tick(dt: number, time: number): void {
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const wave = this.waves[i]; wave.age += dt;
      if (wave.age >= (wave.rupture ? RUPTURE_SECONDS : TIDE_SECONDS)) {
        this.pool.release(wave.layer); this.waves.splice(i, 1); continue;
      }
      const p = tideWave(wave.age, wave.rupture), m = wave.layer.material;
      m.setFloat('uRadius', p.radius); m.setFloat('uThick', p.thickness);
      m.setFloat('uHeight', p.height); m.setFloat('uCrash', p.crash);
      m.setFloat('uAlpha', p.alpha * .88); m.setFloat('uDissolve', p.crash * .35); m.setFloat('uTime', time);
    }
  }
  clear(): void { this.waves.length = 0; this.pool.releaseAll(); }
}
