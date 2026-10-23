import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { Constants } from '@babylonjs/core/Engines/constants.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { COMBAT_DRAW_GROUP, configureCombatDrawOrder } from './visual-kit-draw-order.js';
import { createLoftedWaveLayer, LayerPool, type Layer, type RingProfile } from './visual-kit-layers.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { LongVuongArt } from './visual-long-vuong-art.js';
import { LONG_VUONG as L, waterWave, WAVE_SECONDS } from './visual-long-vuong-timeline.js';

const STAND: RingProfile = [[-.9, 0], [-.55, .35], [-.25, .85], [0, 1.35], [.2, 1.62], [.42, 1.56], [.58, 1.3], [.55, 1.05], [.38, .95], [.3, .6], [.35, .2], [.5, 0]];
const CRASH: RingProfile = [[-.9, 0], [-.5, .15], [-.1, .3], [.3, .42], [.75, .45], [1, .36], [1.15, .22], [1.1, .13], [.9, .1], [.8, .08], [.85, .04], [1, 0]];
type Wave = { at: Vector3; dir: { x: number; z: number }; age: number; reduced: boolean;
  wall: Layer; lane?: Mesh; crest?: Mesh; drops: number };

/** Profiled water volume follows world direction; the painted crash adds foam, never substitutes a flat wall. */
export class LongVuongWave {
  private pool: LayerPool;
  private waves: Wave[] = [];
  constructor(scene: Scene, private art: LongVuongArt, private bank: KitFxBank) {
    configureCombatDrawOrder(scene);
    let serial = 0;
    this.pool = new LayerPool(() => {
      const layer = createLoftedWaveLayer(scene, 'longvuong', `long-vuong-wave-${serial++}`, STAND, CRASH);
      layer.mesh.renderingGroupId = COMBAT_DRAW_GROUP.skill;
      layer.material.depthFunction = Constants.ALWAYS;
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 7;
      return layer;
    }, 4, 'long-vuong-wave');
  }
  start(at: Vector3, dir: { x: number; z: number }, reduced: boolean): void {
    const wall = this.pool.acquire(); if (!wall) return;
    wall.material.setFloat('uRadius', 1); wall.material.setFloat('uSpan', L.width);
    wall.material.setFloat('uThick', .55); wall.material.setFloat('uBend', .35);
    wall.mesh.rotation.y = -Math.atan2(dir.z, dir.x);
    this.waves.push({ at: at.clone(), dir, age: 0, reduced, wall, drops: 0 });
  }
  tick(dt: number, time: number): void {
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const wave = this.waves[i]; wave.age += dt;
      if (wave.age >= WAVE_SECONDS) { this.free(wave); this.waves.splice(i, 1); continue; }
      const pose = waterWave(wave.age, wave.reduced), { at, dir, wall } = wave;
      const head = new Vector3(at.x + dir.x * pose.along, .04, at.z + dir.z * pose.along);
      wall.mesh.position.copyFrom(head);
      // The short-lived action stays above monsters; heroes and HP render in later passes.
      wall.mesh.setEnabled(!wave.reduced);
      wall.material.setFloat('uTime', wave.reduced ? 0 : time);
      wall.material.setFloat('uHeight', pose.height * 2.1); wall.material.setFloat('uCrash', pose.crash);
      wall.material.setFloat('uDissolve', pose.crash * .6); wall.material.setFloat('uAlpha', pose.alpha * .9);
      wave.lane ??= this.art.planes.acquire('lane', true);
      if (wave.lane) {
        this.art.laneUvs(wave.lane);
        // Ground plane local X points down the actual server lane, not along screen-right.
        wave.lane.position.set(at.x + dir.x * L.length / 2, .045, at.z + dir.z * L.length / 2);
        wave.lane.rotation.set(Math.PI / 2, -Math.atan2(dir.z, dir.x), 0);
        wave.lane.scaling.set(L.length, L.width, 1); wave.lane.visibility = pose.alpha * .72;
      }
      if (wave.age >= .38 || wave.reduced) {
        wave.crest ??= this.art.planes.acquire('wave');
        if (wave.crest) {
          this.art.frame(wave.crest, 'wave', pose.frame);
          this.art.place(wave.crest, 'wave', head, L.width, 3.8);
          wave.crest.visibility = pose.alpha * .7;
        }
      }
      if (!wave.reduced) {
        wave.drops += dt * 60;
        const count = Math.min(8, Math.floor(wave.drops)); wave.drops -= count;
        // Distribute emission across the crest instead of a fountain at its centre.
        for (let k = 0; k < count; k++) {
          const side = (Math.random() - .5) * L.width;
          const drop = head.add(new Vector3(-dir.z * side, 1.4 * pose.height, dir.x * side));
          this.bank.spray('longvuong').trail(drop, new Vector3(dir.x * 3, 2.5, dir.z * 3), 1);
        }
      }
    }
  }
  private free(wave: Wave): void {
    this.pool.release(wave.wall); this.art.planes.release(wave.lane); this.art.planes.release(wave.crest);
  }
  clear(): void { for (const wave of this.waves) this.free(wave); this.waves.length = 0; }
}
