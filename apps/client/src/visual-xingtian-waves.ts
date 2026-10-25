import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { debug } from './debug.js';
import { placeStrip, resetStrip } from './visual-de-tuan-strip.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { XingtianImpacts } from './visual-xingtian-impacts.js';
import { laneDistance, MAX_IMPACT_TARGETS, WAVE_HEIGHT, WAVE_LENGTH, WAVE_LIFE, WAVE_WIDTH, waveArrival, wavePose } from './visual-xingtian-timeline.js';

const MAX_WAVES = 6;

type Wave = { origin: Vector3; dir: Vector3; age: number; reduced: boolean; mesh?: Mesh };

/**
 * One fire wave per `fire-wave-h011` (the server sends one per basic attack while the berserk holds): the axe-headed flame
 * ribbon (side-view art, so a camera-facing strip, never flat) runs out from the caster along the event direction to the
 * 6-unit end of the lane, its ember tail trailing and then catching up; every monster the server listed inside the 6 x 2 lane
 * flares as the head reaches it. No sea of fire and no area: the wave only lives along the lane.
 */
export class XingtianWaves {
  private waves: Wave[] = [];

  constructor(private art: KitPainted, private bank: KitFxBank, private impacts: XingtianImpacts) {}

  launch(origin: Vector3, direction: { x: number; z: number }, targets: readonly Vector3[], reduced: boolean): void {
    if (this.waves.length >= MAX_WAVES) { debug('visual.xingtian.cap', { layer: 'wave' }); this.free(this.waves[0]); }
    const dir = new Vector3(direction.x, 0, direction.z);
    this.waves.push({ origin: origin.clone(), dir, age: 0, reduced });
    let flares = 0;
    for (const target of targets) {
      const distance = laneDistance(origin, direction, target);
      if (distance === null || flares >= MAX_IMPACT_TARGETS) continue;
      flares++;
      this.bank.after(waveArrival(distance, reduced), () => this.impacts.spawn(target, reduced));
    }
    debug('visual.xingtian.wave', { targets: targets.length, flares, reduced });
  }

  tick(dt: number, look: Vector3): void {
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const wave = this.waves[i];
      wave.age += dt;
      if (wave.age >= (wave.reduced ? .3 : WAVE_LIFE)) { this.free(wave); continue; }
      this.draw(wave, look);
    }
  }

  clear(): void { for (const wave of [...this.waves]) this.free(wave); }

  private draw(wave: Wave, look: Vector3): void {
    const pose = wavePose(wave.age, wave.reduced);
    if (pose.length < .3) return;
    wave.mesh ??= this.art.acquire('wave');
    const mesh = wave.mesh;
    if (!mesh) return;
    const head = wave.origin.add(wave.dir.scale(pose.head));
    head.y = WAVE_HEIGHT;
    const shown = pose.length / WAVE_LENGTH;
    // Reveal from the head backwards: shrink the UV window and the plane length together so the art is never stretched.
    this.art.mapUvs(mesh, base => base.map((v, k) => (k % 2 === 0 ? 1 - shown + v * shown : v)));
    if (!placeStrip(mesh, head, wave.dir, look, pose.length, WAVE_WIDTH)) { this.free(wave); return; }
    mesh.visibility = pose.alpha;
    if (!wave.reduced && wave.age < .3) {
      this.bank.spray('warfire').trail(head, wave.dir.scale(-2.5).add(new Vector3(0, 1.4, 0)), 2);
    }
  }

  private free(wave: Wave): void {
    resetStrip(wave.mesh);
    this.art.release(wave.mesh);
    const index = this.waves.indexOf(wave);
    if (index >= 0) this.waves.splice(index, 1);
  }
}
