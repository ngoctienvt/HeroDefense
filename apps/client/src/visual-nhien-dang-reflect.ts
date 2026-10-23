import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { cameraLook, resetStrip, placeStrip } from './visual-de-tuan-strip.js';
import { billboardCenter } from './visual-kit-billboard.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { BASIC_LIFE, BASIC_SIZE, basicPose, BURST_SIZE, FLAME_FOOT, REFLECT_LIFE, REFLECT_LIFT, REFLECT_RADIUS, reflectAlpha,
  reflectFrame, RIBBON_FLIGHT, RIBBON_LENGTH, RIBBON_LIFE, RIBBON_WIDTH, ribbonPose } from './visual-nhien-dang-timeline.js';

type Hit = { at: Vector3; from?: Vector3; age: number; reduced: boolean; burst?: Mesh; ribbon?: Mesh; burstPlayed: boolean };
type Puff = { at: Vector3; age: number; mesh?: Mesh };
const MAX_HITS = 10, MAX_PUFFS = 8;

/**
 * Reflect (`reflect-h03W`, one event = one hit): the server hurts every monster within R2.5 of the attacker, so a single
 * cracked-pearl burst with flame wings (its widest frame spans R2.5) plus a ground ring on that exact radius plays AT
 * THE ATTACKER, never at the shielded recipient (the event does not name one). A fire line with a pearl head runs from
 * the cage pearl nearest the attacker (else straight in) just before the burst. Basic attack (`trait-h03W`): a lamp
 * flame blooms at the struck monster. Foreground pass: over monsters, under heroes.
 */
export class NhienDangReflect {
  private hits: Hit[] = [];
  private puffs: Puff[] = [];

  constructor(private scene: Scene, private art: KitPainted, private bank: KitFxBank) {}

  /** `from` = the nearest cage pearl (screen-space centre) or undefined for the burst alone. */
  reflect(attacker: Vector3, from: Vector3 | undefined, reduced: boolean): void {
    if (this.hits.length >= MAX_HITS) { debug('visual.nhiendang.cap', { layer: 'reflect' }); return; }
    const far = from !== undefined && Vector3.DistanceSquared(from, attacker) > 1;
    this.hits.push({ at: attacker.clone(), from: far && !reduced ? from : undefined, age: 0, reduced, burstPlayed: false });
  }

  basic(at: Vector3): void {
    if (this.puffs.length >= MAX_PUFFS) { debug('visual.nhiendang.cap', { layer: 'basic' }); return; }
    this.puffs.push({ at: at.clone(), age: 0 });
  }

  tick(dt: number, up: Vector3): void {
    const look = cameraLook(this.scene);
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const hit = this.hits[i];
      hit.age += dt;
      const delay = hit.from ? RIBBON_FLIGHT : 0;
      if (hit.age >= delay + REFLECT_LIFE && hit.age >= RIBBON_LIFE) { this.free(hit); continue; }
      if (!hit.burstPlayed && hit.age >= delay) this.land(hit);
      this.drawRibbon(hit, look, up);
      this.drawBurst(hit, delay, up);
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const puff = this.puffs[i];
      puff.age += dt;
      if (puff.age >= BASIC_LIFE) { this.art.release(puff.mesh); this.puffs.splice(i, 1); continue; }
      puff.mesh ??= this.art.acquire('flame');
      if (!puff.mesh) continue;
      const pose = basicPose(puff.age), size = BASIC_SIZE * pose.scale;
      puff.mesh.position.copyFrom(billboardCenter(puff.at, size, FLAME_FOOT, up));
      puff.mesh.scaling.set(size, size, 1);
      puff.mesh.visibility = pose.alpha;
      this.art.frame(puff.mesh, pose.frame, 4, 2);
    }
  }

  clear(): void {
    for (const hit of [...this.hits]) this.free(hit);
    for (const puff of this.puffs) this.art.release(puff.mesh);
    this.puffs.length = 0;
  }

  /** The burst frame: ground ring on the real R2.5 edge, motes thrown outward. */
  private land(hit: Hit): void {
    hit.burstPlayed = true;
    this.bank.ring(hit.at, REFLECT_RADIUS, 'lantern', { life: .45, fill: .06, rim: 1, alpha: .9, reduced: hit.reduced, order: 6 });
    if (!hit.reduced) this.bank.spray('lantern').ring(hit.at, .8, 22, .4, 3.4, 4.2);
  }

  private drawBurst(hit: Hit, delay: number, up: Vector3): void {
    const age = hit.age - delay;
    if (age < 0 || age >= REFLECT_LIFE) { if (hit.burst) { this.art.release(hit.burst); hit.burst = undefined; } return; }
    hit.burst ??= this.art.acquire('reflect');
    if (!hit.burst) return;
    hit.burst.position.copyFrom(billboardCenter(hit.at, BURST_SIZE, .5, up, REFLECT_LIFT));
    hit.burst.scaling.set(BURST_SIZE, BURST_SIZE, 1);
    hit.burst.visibility = reflectAlpha(age, hit.reduced);
    this.art.frame(hit.burst, reflectFrame(age, hit.reduced), 4, 2);
  }

  private drawRibbon(hit: Hit, look: Vector3, up: Vector3): void {
    if (!hit.from || hit.age >= RIBBON_LIFE) { if (hit.ribbon) { resetStrip(hit.ribbon); this.art.release(hit.ribbon); hit.ribbon = undefined; } return; }
    hit.ribbon ??= this.art.acquire('ribbon');
    if (!hit.ribbon) return;
    const to = billboardCenter(hit.at, 0, .5, up, REFLECT_LIFT), pose = ribbonPose(hit.age);
    if (!placeStrip(hit.ribbon, Vector3.Lerp(hit.from, to, pose.t), to.subtract(hit.from), look, RIBBON_LENGTH, RIBBON_WIDTH)) {
      resetStrip(hit.ribbon); this.art.release(hit.ribbon); hit.ribbon = undefined; return;
    }
    hit.ribbon.visibility = pose.alpha;
  }

  private free(hit: Hit): void {
    resetStrip(hit.ribbon);
    this.art.release(hit.ribbon); this.art.release(hit.burst);
    const index = this.hits.indexOf(hit);
    if (index >= 0) this.hits.splice(index, 1);
  }
}
