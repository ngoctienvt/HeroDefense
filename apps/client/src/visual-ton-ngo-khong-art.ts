import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { Tier3Art } from './visual-tier3-art.js';
import { billboardCenter, screenUp, farDirection } from './visual-kit-billboard.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { artFrame, crackState, CRACK_LIFE, MONKEY_CAPS, MONKEY, SWEEP_PAINT_ANGLE, type Point } from './visual-ton-ngo-khong-timeline.js';
import layout from './visual-ton-ngo-khong-layout.json';

type Key = keyof typeof layout;
interface Piece { key: Key; at: Vector3; size: number; life: number; age: number; reduced: boolean; mesh?: Mesh; direction?: Point }
interface Lane { origin: Vector3; dir: Point; age: number; reduced: boolean; mesh?: Mesh }
/** Measured painted action is foreground; only the lane's physical scar lies in world. */
export class MonkeyArt {
  private art: Tier3Art<Key>; private pieces: Piece[] = []; private lanes: Lane[] = [];
  constructor(private scene: Scene, private bank: KitFxBank) {
    this.art = new Tier3Art(scene, 'ton-ngo-khong', layout, ['burst', 'puff', 'sweep', 'unravel'], MONKEY_CAPS.painted);
  }
  prepare(): void { this.art.prepare(); }
  play(key: Exclude<Key, 'crack'>, at: Vector3, size: number, life: number, reduced: boolean, direction?: Point): void {
    if (this.pieces.length >= MONKEY_CAPS.painted) return;
    this.pieces.push({ key, at: at.clone(), size, life, age: 0, reduced, direction });
  }
  crack(origin: Vector3, dir: Point, reduced: boolean): void {
    if (this.lanes.length >= MONKEY_CAPS.strikes) return;
    this.lanes.push({ origin: origin.clone(), dir, age: 0, reduced });
  }
  impact(at: Vector3, reduced: boolean, small = false): void {
    this.play('burst', at, small ? 1.45 : 2.65, small ? .36 : .64, reduced);
    this.bank.ring(at, small ? .38 : .72, 'earth', { life: .52, fill: .3, rim: .6, hold: true, reduced, alpha: .72 });
    if (!reduced) this.bank.spray('earth').ring(at, .35, small ? 4 : 9, .12, small ? 1.4 : 2.4, 2.5);
  }
  tick(dt: number): void {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i]; p.age += dt;
      if (p.age >= p.life) { this.art.planes.release(p.mesh); this.pieces.splice(i, 1); continue; }
      p.mesh ??= this.art.planes.acquire(p.key);
      if (!p.mesh) continue;
      this.art.frame(p.mesh, p.key, artFrame(p.age, p.life, layout[p.key].frames, p.reduced));
      this.art.place(p.mesh, p.key, p.at, p.size);
      // The crescent was painted up-right. Rotate its camera-plane basis toward the actual attack projection.
      if (p.key === 'sweep' && p.direction) this.orientSweep(p.mesh, p.at, p.size, p.direction);
      p.mesh.visibility = Math.min(1, (p.life - p.age) / .12);
    }
    for (let i = this.lanes.length - 1; i >= 0; i--) {
      const p = this.lanes[i]; p.age += dt;
      if (p.age >= CRACK_LIFE) { this.art.planes.release(p.mesh); this.lanes.splice(i, 1); continue; }
      p.mesh ??= this.art.planes.acquire('crack', true); if (!p.mesh) continue;
      const s = crackState(p.age, p.reduced), length = MONKEY.length * s.reveal;
      p.mesh.position.set(p.origin.x + p.dir.x * length / 2, .065, p.origin.z + p.dir.z * length / 2);
      p.mesh.rotation.set(Math.PI / 2, Math.atan2(-p.dir.z, p.dir.x), 0);
      p.mesh.scaling.set(length, MONKEY.width * s.width, 1); p.mesh.visibility = s.alpha;
      this.art.planes.mapUvs(p.mesh, base => base.map((v, k) => k % 2 === 0 ? v * s.reveal : v));
    }
  }
  private orientSweep(mesh: Mesh, at: Vector3, size: number, dir: Point): void {
    const up = screenUp(this.scene), forward = farDirection(this.scene).scale(.743).add(new Vector3(0, -.669, 0));
    const right = Vector3.Cross(up, forward).normalize();
    const angle = Math.atan2(Vector3.Dot(new Vector3(dir.x, 0, dir.z), up), Vector3.Dot(new Vector3(dir.x, 0, dir.z), right)) - SWEEP_PAINT_ANGLE;
    const x = right.scale(Math.cos(angle)).add(up.scale(Math.sin(angle)));
    const y = up.scale(Math.cos(angle)).subtract(right.scale(Math.sin(angle)));
    mesh.billboardMode = Mesh.BILLBOARDMODE_NONE; mesh.rotationQuaternion = null;
    mesh.rotation.copyFrom(Vector3.RotationFromAxis(x, y, Vector3.Cross(x, y)));
    const l = layout.sweep;
    mesh.position.copyFrom(billboardCenter(at, size, l.anchorY, y).add(x.scale((.5 - l.anchorX) * size)));
  }
  clear(): void { this.pieces.length = 0; this.lanes.length = 0; this.art.clear(); }
}


