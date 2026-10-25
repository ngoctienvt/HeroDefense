import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { debug } from './debug.js';
import { billboardCenter } from './visual-kit-billboard.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { BOLT_ANCHOR_Y, BOLT_FRAMES, BOLT_LIFE, BOLT_SIZE, boltAlpha, boltFrame, SCORCH_LIFE,
  SCORCH_RADIUS } from './visual-khuongtu-nha-timeline.js';

type Strike = { at: Vector3; age: number; reduced: boolean; mesh?: Mesh };
const MAX_STRIKES = 12;

/**
 * One `bolt-h019` event = one thunder strike on exactly one target: a jade-white bolt drops out of the sky onto the
 * point, bursts into jade shards and leaves a small burnt dot (Codex hit sheet, billboard in the foreground pass: over
 * monsters, under heroes). Never an area blast: the R7 zone is the scroll's, the strikes are eight single points.
 */
export class KhuongtuBolts {
  private strikes: Strike[] = [];

  constructor(private art: KitPainted, private bank: KitFxBank) {}

  strike(at: Vector3, reduced: boolean): boolean {
    if (this.strikes.length >= MAX_STRIKES) { debug('visual.khuongtu.cap', { layer: 'bolt' }); return false; }
    this.strikes.push({ at: at.clone(), age: 0, reduced });
    // The burnt dot and the small shock ring land with the burst (frame 3), not with the first spark.
    this.bank.after(reduced ? 0 : .1, () => this.land(at, reduced));
    return true;
  }

  tick(dt: number, up: Vector3): void {
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const strike = this.strikes[i];
      strike.age += dt;
      if (strike.age >= BOLT_LIFE) { this.free(strike); continue; }
      strike.mesh ??= this.art.acquire('boltHit');
      if (!strike.mesh) continue;
      strike.mesh.position.copyFrom(billboardCenter(new Vector3(strike.at.x, 0, strike.at.z), BOLT_SIZE, BOLT_ANCHOR_Y, up));
      strike.mesh.scaling.setAll(BOLT_SIZE);
      strike.mesh.visibility = boltAlpha(strike.age);
      this.art.frame(strike.mesh, boltFrame(strike.age, strike.reduced), 4, BOLT_FRAMES / 4);
    }
  }

  clear(): void { for (const strike of [...this.strikes]) this.free(strike); }

  private land(at: Vector3, reduced: boolean): void {
    this.bank.ring(at, SCORCH_RADIUS, 'earth', { life: SCORCH_LIFE, fill: .55, rim: .5, alpha: .6, hold: true, reduced, order: 5 });
    this.bank.ring(at, SCORCH_RADIUS * 1.5, 'jade', { life: .22, fill: .12, rim: 1, alpha: .8, reduced, order: 6 });
    if (reduced) return;
    this.bank.spray('jade').ring(at, .25, 14, .2, 2.2, 3.6);
    this.bank.spray('gold').ring(at, .2, 8, .15, 1.6, 2.8);
  }

  private free(strike: Strike): void {
    this.art.release(strike.mesh);
    const index = this.strikes.indexOf(strike);
    if (index >= 0) this.strikes.splice(index, 1);
  }
}
