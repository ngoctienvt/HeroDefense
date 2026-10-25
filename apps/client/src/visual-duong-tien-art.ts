import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera.js';
import { Tier3Art } from './visual-tier3-art.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { screenUp, farDirection } from './visual-kit-billboard.js';
import { DTN_CAPS, DUONG_TIEN as D, BEAM_LIFE, SCORCH_LIFE, beamContactDelay, eyeBeamState, eyeScorchState, type Point } from './visual-duong-tien-timeline.js';
import { debug } from './debug.js';
import layout from './visual-duong-tien-layout.json';
export type HeavenArtKey = keyof typeof layout;
interface Contact { at: Vector3; delay: number; done: boolean }
interface Beam { origin?: Vector3; dir?: Point; targets: Contact[]; age: number; reduced: boolean; beam?: Mesh; scorch?: Mesh; eye?: Mesh }
interface Glint { at: Vector3; age: number; reduced: boolean; mesh?: Mesh }
export class HeavenArt {
  readonly paint: Tier3Art<HeavenArtKey>; private beams: Beam[] = []; private glints: Glint[] = [];
  constructor(private scene: Scene, private bank: KitFxBank) { this.paint = new Tier3Art(scene, 'duong-tien', layout, ['eye', 'beam'], DTN_CAPS.planes); }
  prepare(): void { this.paint.prepare(); }
  strike(origin: Vector3 | undefined, dir: Point | undefined, targets: readonly Vector3[], reduced: boolean): void {
    if (this.beams.length >= DTN_CAPS.strikes) return;
    this.beams.push({ origin: origin?.clone(), dir, age: 0, reduced, targets: targets.slice(0, DTN_CAPS.targets).map(at => ({ at: at.clone(), delay: beamContactDelay(origin, dir, at, reduced), done: false })) });
  }
  placeEye(mesh: Mesh, at: Vector3, size: number): void {
    const right = Vector3.Cross(screenUp(this.scene), farDirection(this.scene)).normalize();
    this.paint.place(mesh, 'eye', at.add(right.scale(.8)), size, undefined, 3.2);
  }
  private impact(at: Vector3, reduced: boolean): void {
    if (this.glints.length < DTN_CAPS.planes) this.glints.push({ at: at.clone(), age: 0, reduced });
    this.bank.ring(at, .58, 'gold', { life: .3, fill: .18, rim: .65, reduced, hold: true, alpha: .85 });
    this.bank.ring(at, .44, 'earth', { life: .65, fill: .25, rim: .15, reduced, hold: true, alpha: .65 });
    if (!reduced) this.bank.spray('gold').ring(at, .16, 9, .4, 1.8, 2.2);
    debug('visual.duong-tien.contact', { reduced });
  }
  tick(dt: number): void {
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const p = this.beams[i]; p.age += dt;
      for (const target of p.targets) if (!target.done && p.age >= target.delay) { target.done = true; this.impact(target.at, p.reduced); }
      if (p.age >= SCORCH_LIFE) { this.release(p); this.beams.splice(i, 1); continue; }
      if (!p.origin || !p.dir) continue;
      const beam = eyeBeamState(p.age, p.reduced), scar = eyeScorchState(p.age, p.reduced);
      if (p.age < BEAM_LIFE) {
        p.beam ??= this.paint.planes.acquire('beam');
        if (p.beam) {
          this.placeBeam(p.beam, p.origin, p.dir, beam.reveal); p.beam.visibility = beam.alpha;
          // Raw head is at +U: retain it at the moving front while length/UV span grow together.
          this.paint.planes.mapUvs(p.beam, base => base.map((v, k) => k % 2 === 0 ? 1 - beam.reveal + v * beam.reveal : v));
        }
        p.eye ??= this.paint.planes.acquire('eye');
        if (p.eye) { this.placeEye(p.eye, p.origin, 1.8); this.paint.frame(p.eye, 'eye', p.reduced ? 6 : Math.max(0, 7 - Math.floor(p.age / BEAM_LIFE * 8))); p.eye.visibility = beam.alpha; }
      } else { this.paint.planes.release(p.beam); this.paint.planes.release(p.eye); p.beam = p.eye = undefined; }
      p.scorch ??= this.paint.planes.acquire('scorch', true);
      if (p.scorch) {
        const length = D.length * Math.max(.001, scar.head - scar.tail), center = D.length * (scar.head + scar.tail) / 2;
        p.scorch.position.set(p.origin.x + p.dir.x * center, .055, p.origin.z + p.dir.z * center);
        p.scorch.rotation.set(Math.PI / 2, Math.atan2(-p.dir.z, p.dir.x), 0); p.scorch.scaling.set(length, D.width * scar.width, 1); p.scorch.visibility = scar.alpha * .85;
        this.paint.planes.mapUvs(p.scorch, base => base.map((v, k) => k % 2 === 0 ? scar.tail + v * (scar.head - scar.tail) : v));
      }
    }
    for (let i = this.glints.length - 1; i >= 0; i--) {
      const p = this.glints[i]; p.age += dt;
      if (p.age >= .22) { this.paint.planes.release(p.mesh); this.glints.splice(i, 1); continue; }
      p.mesh ??= this.paint.planes.acquire('beam'); if (!p.mesh) continue;
      // The actual eye-light head becomes a short local contact glint; no crescent normal-attack art is consumed.
      this.paint.place(p.mesh, 'beam', p.at, 1.1, .65, .65); p.mesh.rotation.z = Math.PI / 2;
      this.paint.planes.mapUvs(p.mesh, base => base.map((v, k) => k % 2 === 0 ? .72 + v * .28 : v)); p.mesh.visibility = Math.max(0, 1 - p.age / .22);
    }
  }
  private placeBeam(mesh: Mesh, at: Vector3, dir: Point, reveal: number): void {
    const x = new Vector3(dir.x, 0, dir.z), up = screenUp(this.scene), camera = this.scene.activeCamera as TargetCamera | null;
    const look = camera && typeof camera.getTarget === 'function' ? camera.getTarget().subtract(camera.position).normalize() : new Vector3(0, -.669, -.743);
    let z = look.subtract(x.scale(Vector3.Dot(look, x)));
    z = z.lengthSquared() > 1e-6 ? z.normalize() : Vector3.Up();
    let y = Vector3.Cross(z, x).normalize(); if (Vector3.Dot(y, up) < 0) { y = y.scale(-1); z.scaleInPlace(-1); }
    mesh.billboardMode = Mesh.BILLBOARDMODE_NONE; mesh.rotationQuaternion = null; mesh.rotation.copyFrom(Vector3.RotationFromAxis(x, y, z));
    const length = D.length * Math.max(.001, reveal); mesh.position.set(at.x + dir.x * length / 2, 1.35, at.z + dir.z * length / 2);
    mesh.scaling.set(length, Math.min(D.width, D.length / layout.beam.aspect), 1);
  }
  private release(p: Beam): void { this.paint.planes.release(p.beam); this.paint.planes.release(p.eye); this.paint.planes.release(p.scorch); }
  clear(): void { this.beams.length = 0; this.glints.length = 0; this.paint.clear(); }
}


