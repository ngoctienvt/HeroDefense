import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { KIMSI as K } from '../../../content/kimsi-design.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { BURST_LIFE, burstAlpha, burstFrame, burstScale, STORM_SIZE, STORM_SLASH_LIFE, STORM_SLASHES,
  stormSlashDirection } from './visual-kimsi-timeline.js';

type Burst = { at: Vector3; age: number; reduced: boolean; mesh?: Mesh };
const MAX_BURSTS = 3;

/**
 * The storm itself at the caster, the instant the server resolves: the cut/burst/dissipate frames of the Codex storm
 * sheet laid flat over the whole R6.5 (foreground pass), one rim ring at exactly the gameplay edge, four crescents
 * cut into the ground at once and gold chips thrown outward. One resolve = one burst; the monsters' own cuts are
 * `KimsiCuts`. No fire ring: the ring is a thin gold rim and the rest is feather art.
 */
export class KimsiStorm {
  private bursts: Burst[] = [];

  constructor(private art: KitPainted, private bank: KitFxBank) {}

  play(at: Vector3, reduced: boolean): void {
    if (this.bursts.length >= MAX_BURSTS) this.free(this.bursts[0]);
    this.bursts.push({ at: at.clone(), age: 0, reduced });
    this.bank.ring(at, K.stormRadius, 'goldwing', { life: .5, fill: 0, rim: 1, alpha: .9, reduced, order: 6 });
    if (reduced) return;
    for (let i = 0; i < STORM_SLASHES; i++)
      this.bank.slash(at, stormSlashDirection(i), K.stormRadius * .78, 1.1, 'goldwing', STORM_SLASH_LIFE, false);
    this.bank.spray('goldwing').ring(at, 1.2, 46, .3, 7.5, 5);
    this.bank.spray('goldwing').ring(at, K.stormRadius * .6, 22, .2, 2.4, 3.4);
  }

  tick(dt: number): void {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i];
      burst.age += dt;
      if (burst.age >= BURST_LIFE) { this.free(burst); continue; }
      const alpha = burstAlpha(burst.age, burst.reduced);
      burst.mesh ??= this.art.acquire('storm', true);
      if (!burst.mesh) continue;
      burst.mesh.position.set(burst.at.x, .07, burst.at.z);
      burst.mesh.scaling.setAll(STORM_SIZE * burstScale(burst.age, burst.reduced));
      burst.mesh.visibility = alpha;
      this.art.frame(burst.mesh, burstFrame(burst.age, burst.reduced), 4, 4);
    }
  }

  clear(): void { for (const burst of [...this.bursts]) this.free(burst); }

  private free(burst: Burst): void {
    this.art.release(burst.mesh);
    const index = this.bursts.indexOf(burst);
    if (index >= 0) this.bursts.splice(index, 1);
  }
}
