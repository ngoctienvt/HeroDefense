import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { Tier3Art } from './visual-tier3-art.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { screenUp } from './visual-kit-billboard.js';
import { LOI, LC_CAPS, BOLT_CONTACT, PULSE_LIFE, boltPose } from './visual-loi-chan-tu-timeline.js';
import { debug } from './debug.js';
import layout from './visual-loi-chan-tu-layout.json';
export type StormArtKey = keyof typeof layout;
interface Strike { at: Vector3; targets: readonly Vector3[]; age: number; reduced: boolean; impacted: boolean; bolt?: Mesh; hit?: Mesh }
/** One real pulse owns one feather bolt and one R1.5 contact, never a large blast per victim. */
export class StormArt {
  readonly paint: Tier3Art<StormArtKey>; private strikes: Strike[] = [];
  constructor(private scene: Scene, private bank: KitFxBank) { this.paint = new Tier3Art(scene, 'loi-chan-tu', layout, ['cloud', 'bolt', 'hit', 'burn'], LC_CAPS.planes); }
  prepare(): void { this.paint.prepare(); }
  pulse(at: Vector3, targets: readonly Vector3[], reduced: boolean): void {
    if (this.strikes.length >= LC_CAPS.strikes) return;
    this.strikes.push({ at: at.clone(), targets: targets.slice(0, LC_CAPS.targets).map(p => p.clone()), age: 0, reduced, impacted: false });
  }
  tick(dt: number): void {
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const p = this.strikes[i]; p.age += dt; const state = boltPose(p.age, p.reduced);
      if (!p.impacted && p.age >= (p.reduced ? 0 : BOLT_CONTACT)) {
        p.impacted = true;
        this.bank.ring(p.at, LOI.hitRadius, 'netherfire', { life: .54, fill: .08, rim: .6, reduced: p.reduced, hold: true, alpha: .7 });
        this.bank.ring(p.at, LOI.hitRadius * .8, 'earth', { life: .65, fill: .24, rim: .25, reduced: p.reduced, hold: true, alpha: .65 });
        if (!p.reduced) {
          this.bank.spray('earth').ring(p.at, .45, 10, .15, 2.3, 3);
          for (const target of p.targets) if (Vector3.DistanceSquared(target, p.at) > .5)
            this.bank.spray('gold').ring(target, .08, 2, .3, .5, 1.2);
        }
        debug('visual.loi-chan-tu.pulse.contact', { targets: p.targets.length, reduced: p.reduced });
      }
      if (p.age >= PULSE_LIFE) { this.paint.planes.release(p.bolt); this.paint.planes.release(p.hit); this.strikes.splice(i, 1); continue; }
      if (state.visible) {
        p.bolt ??= this.paint.planes.acquire('bolt'); if (p.bolt) this.placeBolt(p.bolt, p.at, state.headHeight);
      } else { this.paint.planes.release(p.bolt); p.bolt = undefined; }
      if (p.impacted) {
        p.hit ??= this.paint.planes.acquire('hit'); if (!p.hit) continue;
        this.paint.frame(p.hit, 'hit', state.hitFrame); this.paint.place(p.hit, 'hit', p.at, LOI.hitRadius / layout.hit.contactHalfWidth); p.hit.visibility = state.alpha;
      }
    }
  }
  private placeBolt(mesh: Mesh, at: Vector3, headHeight: number): void {
    const axis = new Vector3(0, -1, 0), up = screenUp(this.scene);
    // Camera-right transverse vector keeps feather branches visible while +U points down at the real focus.
    const side = new Vector3(-1, 0, 0); const x = axis, y = side;
    mesh.billboardMode = Mesh.BILLBOARDMODE_NONE; mesh.rotationQuaternion = null;
    // Use the camera-facing horizontal right axis even when the battlefield camera orbits.
    const across = Vector3.Cross(axis, up); if (across.lengthSquared() > .001) y.copyFrom(across.normalize());
    mesh.rotation.copyFrom(Vector3.RotationFromAxis(x, y, Vector3.Cross(x, y)));
    const length = 4; mesh.position.copyFrom(at).addInPlace(new Vector3(0, headHeight + length / 2, 0));
    mesh.scaling.set(length, length / layout.bolt.aspect, 1); mesh.visibility = .94;
  }
  clear(): void { this.strikes.length = 0; this.paint.clear(); }
}

