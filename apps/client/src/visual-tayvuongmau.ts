import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { TAYVUONGMAU as T } from '../../../content/tayvuongmau-design.js';
import { debug } from './debug.js';

type Flight = { mesh: Mesh; from: Vector3; to: Vector3; age: number; life: number; peach: boolean };
type Blessing = { mesh: Mesh; touched: boolean };

/** Phoenix-shaped hairpins, falling metal rain, and recipient-specific peaches. */
export class VisualTayvuongmau {
  private pins: Mesh[] = [];
  private peaches: Mesh[] = [];
  private flights: Flight[] = [];
  private blessings = new Map<string, Blessing>();
  private blessingPool: Mesh[] = [];
  private gold: StandardMaterial;
  private rose: StandardMaterial;
  private jade: StandardMaterial;

  constructor(private scene: Scene) {
    this.gold = this.material('tayvuongmau-gold', '#deb455', .92);
    this.rose = this.material('tayvuongmau-peach', '#e89aa3', .9);
    this.jade = this.material('tayvuongmau-jade', '#77b795', .9);
  }

  private material(name: string, color: string, alpha: number): StandardMaterial {
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = Color3.FromHexString(color);
    material.emissiveColor = material.diffuseColor.scale(.24);
    material.alpha = alpha;
    material.backFaceCulling = false;
    material.disableDepthWrite = true;
    return material;
  }

  private pin(): Mesh {
    const pin = this.pins.pop() ?? MeshBuilder.CreateCylinder('phoenix-hairpin',
      { height: 1.2, diameterTop: .1, diameterBottom: .04, tessellation: 8 }, this.scene);
    if (!pin.getChildMeshes().length) {
      for (const side of [-1, 1]) {
        const wing = MeshBuilder.CreatePlane('phoenix-wing', { width: .7, height: .28 }, this.scene);
        wing.parent = pin; wing.position.set(side * .28, .35, 0);
        wing.rotation.z = side * .42; wing.material = this.gold; wing.isPickable = false;
      }
    }
    pin.material = this.gold; pin.isPickable = false; pin.setEnabled(true);
    return pin;
  }

  private peach(): Mesh {
    const peach = this.peaches.pop() ?? MeshBuilder.CreateSphere('immortal-peach',
      { diameter: .8, segments: 12 }, this.scene);
    if (!peach.getChildMeshes().length) {
      const leaf = MeshBuilder.CreatePlane('peach-leaf', { width: .42, height: .22 }, this.scene);
      leaf.parent = peach; leaf.position.set(.13, .42, 0);
      leaf.rotation.z = -.4; leaf.material = this.jade; leaf.isPickable = false;
    }
    peach.material = this.rose; peach.isPickable = false; peach.setEnabled(true);
    return peach;
  }

  private launch(mesh: Mesh, from: Vector3, to: Vector3, life: number, peach: boolean): void {
    if (this.flights.length >= 48) { mesh.setEnabled(false); (peach ? this.peaches : this.pins).push(mesh); return; }
    mesh.position.copyFrom(from); mesh.visibility = 1;
    this.flights.push({ mesh, from, to, life, age: 0, peach });
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean): void {
    if (reduced) return;
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const origin = at.add(new Vector3(Math.cos(angle) * 1.1, 2.2 + i * .08,
        Math.sin(angle) * 1.1));
      this.launch(this.pin(), origin, origin.add(new Vector3(0, 1, 0)),
        event.windup ?? .25, false);
    }
    debug('visual.tayvuongmau.cast', { eventId: event.id });
  }

  attack(event: GameEvent, from: Vector3, targets: Vector3[], reduced: boolean): void {
    const selected = reduced ? targets.slice(0, 1) : targets.slice(0, T.pins);
    for (const target of selected) this.launch(this.pin(),
      from.add(new Vector3(0, 2, 0)), target.add(new Vector3(0, 1.2, 0)), .33, false);
    debug('visual.tayvuongmau.pins', { eventId: event.id, targets: selected.length });
  }

  rain(event: GameEvent, at: Vector3, reduced: boolean): void {
    const count = reduced ? 8 : 24;
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399963, radius = T.rainRadius * Math.sqrt((i + .5) / count);
      const x = at.x + Math.cos(angle) * radius, z = at.z + Math.sin(angle) * radius;
      this.launch(this.pin(), new Vector3(x, reduced ? 3 : 7 + i % 4, z),
        new Vector3(x, .15, z), reduced ? .2 : .34 + i % 4 * .065, false);
    }
    debug('visual.tayvuongmau.rain', { eventId: event.id, targets: event.targets?.length ?? 0 });
  }

  gift(event: GameEvent, from: Vector3, to: Vector3, reduced: boolean): void {
    this.launch(this.peach(), from.add(new Vector3(0, 2.4, 0)),
      to.add(new Vector3(0, 1.6, 0)), reduced ? .22 : .55, true);
    debug('visual.tayvuongmau.peach', { eventId: event.id, recipient: event.target });
  }

  markBlessing(id: string, at: Vector3): void {
    let blessing = this.blessings.get(id);
    if (!blessing) {
      if (this.blessings.size >= 20) return;
      const mesh = this.blessingPool.pop() ?? MeshBuilder.CreateTorus('peach-blessing',
        { diameter: 2.4, thickness: .1, tessellation: 20 }, this.scene);
      mesh.material = this.rose; mesh.isPickable = false; mesh.setEnabled(true);
      blessing = { mesh, touched: false }; this.blessings.set(id, blessing);
    }
    blessing.touched = true; blessing.mesh.position.set(at.x, .08, at.z);
  }

  tick(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (const [id, blessing] of this.blessings) {
      if (blessing.touched) { blessing.touched = false; continue; }
      blessing.mesh.setEnabled(false); this.blessingPool.push(blessing.mesh); this.blessings.delete(id);
    }
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const flight = this.flights[i]; flight.age += dt;
      if (flight.age >= flight.life) {
        flight.mesh.setEnabled(false);
        (flight.peach ? this.peaches : this.pins).push(flight.mesh);
        this.flights.splice(i, 1); continue;
      }
      const progress = flight.age / flight.life;
      Vector3.LerpToRef(flight.from, flight.to, progress, flight.mesh.position);
      if (flight.peach) flight.mesh.position.y += Math.sin(progress * Math.PI) * .7;
      else flight.mesh.rotation.z = Math.atan2(flight.to.x - flight.from.x,
        flight.to.y - flight.from.y);
      flight.mesh.visibility = Math.min(1, (1 - progress) * 3);
    }
  }

  clear(): void {
    for (const flight of this.flights) {
      flight.mesh.setEnabled(false); (flight.peach ? this.peaches : this.pins).push(flight.mesh);
    }
    this.flights.length = 0;
    for (const blessing of this.blessings.values()) {
      blessing.mesh.setEnabled(false); this.blessingPool.push(blessing.mesh);
    }
    this.blessings.clear();
  }
}
