import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';

type Flight = { root: TransformNode; age: number; life: number; from: Vector3; to: Vector3 };
type Monument = { root: TransformNode; touched: boolean };

/** Solid gold blades and bronze ritual vessels for Hiên Viên's confirmed events. */
export class VisualHienvien {
  private flights: Flight[] = [];
  private bladePool: TransformNode[] = [];
  private monuments = new Map<string, Monument>();
  private monumentPool: TransformNode[] = [];
  private blessing = new Map<string, { root: TransformNode; touched: boolean }>();
  private blessingPool: TransformNode[] = [];
  private readonly gold: StandardMaterial;
  private readonly edge: StandardMaterial;
  private readonly bronze: StandardMaterial;

  constructor(private readonly scene: Scene) {
    this.gold = this.material('hienvien-blade', '#dfaf35', .35);
    this.edge = this.material('hienvien-blade-edge', '#fff1a5', .45);
    this.bronze = this.material('hienvien-ding', '#795d36', .12);
  }

  private material(name: string, color: string, glow: number): StandardMaterial {
    const mat = new StandardMaterial(name, this.scene);
    mat.diffuseColor = Color3.FromHexString(color);
    mat.emissiveColor = mat.diffuseColor.scale(glow);
    mat.specularColor = Color3.FromHexString('#e5c686');
    mat.backFaceCulling = false;
    return mat;
  }

  private blade(): TransformNode {
    const root = new TransformNode('hienvien-solid-sword', this.scene);
    const body = MeshBuilder.CreateCylinder('sword-blade', {
      height: 2.6, diameterTop: .08, diameterBottom: .39, tessellation: 4,
    }, this.scene);
    body.parent = root; body.position.y = 1.8; body.rotation.y = Math.PI / 4; body.material = this.gold;
    const glint = MeshBuilder.CreateBox('sword-edge', { width: .08, height: 2.45, depth: .08 }, this.scene);
    glint.parent = root; glint.position.set(.16, 1.78, .16); glint.material = this.edge;
    const guard = MeshBuilder.CreateBox('sword-crossguard', { width: 1.1, height: .17, depth: .24 }, this.scene);
    guard.parent = root; guard.position.y = .45; guard.material = this.gold;
    const grip = MeshBuilder.CreateCylinder('sword-grip', { height: .85, diameter: .18, tessellation: 8 }, this.scene);
    grip.parent = root; grip.position.y = -.04; grip.material = this.bronze;
    for (const mesh of [body, glint, guard, grip]) mesh.isPickable = false;
    return root;
  }

  private dingRing(): TransformNode {
    const root = new TransformNode('hienvien-nine-ding', this.scene);
    const monumentSword = this.blade();
    monumentSword.parent = root;
    monumentSword.scaling.setAll(3.5);
    monumentSword.position.y = 1;
    for (let i = 0; i < 9; i++) {
      const angle = i * Math.PI * 2 / 9;
      const ding = new TransformNode(`ding-${i}`, this.scene);
      ding.parent = root; ding.position.set(Math.cos(angle) * 7.1, 0, Math.sin(angle) * 7.1);
      const bowl = MeshBuilder.CreateCylinder('ding-bowl', {
        height: .9, diameterTop: 1.25, diameterBottom: .85, tessellation: 10,
      }, this.scene);
      bowl.parent = ding; bowl.position.y = .86; bowl.material = this.bronze;
      const lip = MeshBuilder.CreateTorus('ding-rim', { diameter: 1.24, thickness: .11, tessellation: 12 }, this.scene);
      lip.parent = ding; lip.position.y = 1.34; lip.material = this.gold;
      for (let leg = 0; leg < 3; leg++) {
        const a = leg * Math.PI * 2 / 3;
        const foot = MeshBuilder.CreateCylinder('ding-foot', { height: .43, diameter: .15, tessellation: 6 }, this.scene);
        foot.parent = ding; foot.position.set(Math.cos(a) * .32, .22, Math.sin(a) * .32);
        foot.material = this.bronze; foot.isPickable = false;
      }
      bowl.isPickable = lip.isPickable = false;
    }
    return root;
  }

  private fly(from: Vector3, to: Vector3, size: number, life: number): void {
    if (this.flights.length >= 36) return;
    const root = this.bladePool.pop() ?? this.blade();
    root.setEnabled(true); root.scaling.setAll(size);
    root.position.copyFrom(from);
    this.flights.push({ root, from, to, age: 0, life });
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean): void {
    const count = reduced ? 1 : 5;
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count;
      const point = at.add(new Vector3(Math.cos(angle) * 2.1, 2.7, Math.sin(angle) * 2.1));
      this.fly(point.add(new Vector3(0, .7, 0)), point, .5, event.windup ?? .25);
    }
    debug('visual.hienvien.cast', { eventId: event.id, reduced });
  }

  attack(event: GameEvent, from: Vector3, to: Vector3, reduced: boolean): void {
    const count = reduced ? 1 : 5;
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * .55;
      this.fly(from.add(new Vector3(offset, 2.1, 0)), to.add(new Vector3(offset, 1.3, 0)), .55, .23);
    }
    debug('visual.hienvien.attack', { eventId: event.id, swords: count });
  }

  impact(event: GameEvent, at: Vector3, reduced: boolean): void {
    this.fly(at.add(new Vector3(0, reduced ? 10 : 23, 0)), at, reduced ? 2.5 : 6, .38);
    debug('visual.hienvien.impact', { eventId: event.id, reduced });
  }

  rain(event: GameEvent, at: Vector3, reduced: boolean): void {
    this.fly(at.add(new Vector3(0, reduced ? 5 : 10, 0)), at.add(new Vector3(0, .15, 0)),
      reduced ? .48 : .8, reduced ? .14 : .22);
    debug('visual.hienvien.rain', { eventId: event.id });
  }

  markMonument(id: string, at: Vector3): void {
    let marker = this.monuments.get(id);
    if (!marker) {
      if (this.monuments.size >= 8) return;
      marker = { root: this.monumentPool.pop() ?? this.dingRing(), touched: false };
      this.monuments.set(id, marker); marker.root.setEnabled(true);
    }
    marker.root.position.copyFrom(at); marker.touched = true;
  }

  markBlessing(id: string, at: Vector3): void {
    let marker = this.blessing.get(id);
    if (!marker) {
      if (this.blessing.size >= 32) return;
      const root = this.blessingPool.pop() ?? this.makeBlessing();
      marker = { root, touched: false }; this.blessing.set(id, marker); root.setEnabled(true);
    }
    marker.root.position.copyFrom(at); marker.touched = true;
  }

  private makeBlessing(): TransformNode {
    const root = new TransformNode('hienvien-blessing', this.scene);
    for (let i = 0; i < 3; i++) {
      const sword = this.blade(); sword.parent = root;
      const angle = i * Math.PI * 2 / 3;
      sword.position.set(Math.cos(angle) * .75, 2.3, Math.sin(angle) * .75);
      sword.scaling.setAll(.2);
    }
    return root;
  }

  tick(dt: number): void {
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const flight = this.flights[i]; flight.age += dt;
      if (flight.age >= flight.life) {
        flight.root.setEnabled(false); this.bladePool.push(flight.root);
        this.flights.splice(i, 1); continue;
      }
      flight.root.position.copyFrom(Vector3.Lerp(flight.from, flight.to, flight.age / flight.life));
    }
    for (const [id, marker] of this.monuments) {
      if (marker.touched) marker.touched = false;
      else { marker.root.setEnabled(false); this.monumentPool.push(marker.root); this.monuments.delete(id); }
    }
    for (const [id, marker] of this.blessing) {
      if (marker.touched) marker.touched = false;
      else { marker.root.setEnabled(false); this.blessingPool.push(marker.root); this.blessing.delete(id); }
    }
  }

  clear(): void {
    for (const flight of this.flights) { flight.root.setEnabled(false); this.bladePool.push(flight.root); }
    this.flights.length = 0;
    for (const marker of this.monuments.values()) { marker.root.setEnabled(false); this.monumentPool.push(marker.root); }
    this.monuments.clear();
    for (const marker of this.blessing.values()) { marker.root.setEnabled(false); this.blessingPool.push(marker.root); }
    this.blessing.clear();
  }
}
