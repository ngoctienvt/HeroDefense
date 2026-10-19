import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';

type Timed = { meshes: Mesh[]; remaining: number; duration: number; hand?: boolean };
type Ground = { meshes: Mesh[]; touched: boolean };
type Aura = { meshes: Mesh[]; touched: boolean;
  kind: 'lantern' | 'buddha' | 'solar' | 'bodhi' | 'cloud' | 'primordial'; at: Vector3 };
const LIMIT = 24;

export class VisualDivine {
  private timed: Timed[] = [];
  private ground = new Map<string, Ground>();
  private auras = new Map<string, Aura>();
  private elapsed = 0;
  private gold: StandardMaterial;
  private pale: StandardMaterial;
  private fire: StandardMaterial;
  private leaf: StandardMaterial;
  private stone: StandardMaterial;
  private void: StandardMaterial;
  private shield: StandardMaterial;

  constructor(private scene: Scene) {
    const mat = (name: string, color: string, alpha: number) => {
      const material = new StandardMaterial(`divine-${name}`, scene);
      material.diffuseColor = Color3.FromHexString(color);
      material.emissiveColor = material.diffuseColor.scale(.38);
      material.alpha = alpha;
      material.backFaceCulling = false;
      material.disableDepthWrite = alpha < 1;
      return material;
    };
    this.gold = mat('gold', '#eecb6f', .83);
    this.pale = mat('pale', '#f4eac9', .7);
    this.fire = mat('fire', '#f5a639', .78);
    this.leaf = mat('leaf', '#78bc79', .78);
    this.stone = mat('stone', '#b9aa7e', .9);
    this.void = mat('void', '#6b5b99', .76);
    this.shield = mat('shield', '#f8df9a', .22);
  }

  private add(meshes: Mesh[], mesh: Mesh, material: StandardMaterial): Mesh {
    mesh.material = material;
    mesh.isPickable = false;
    meshes.push(mesh);
    return mesh;
  }

  private sphere(meshes: Mesh[], at: Vector3, size: number, material: StandardMaterial): Mesh {
    const mesh = this.add(meshes, MeshBuilder.CreateSphere('divine-orb',
      { diameter: size, segments: 8 }, this.scene), material);
    mesh.position.copyFrom(at);
    return mesh;
  }

  private timedEffect(meshes: Mesh[], duration: number, hand = false): void {
    if (this.timed.length >= LIMIT) this.release(this.timed.shift()!.meshes);
    this.timed.push({ meshes, remaining: duration, duration, hand });
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean): void {
    const meshes: Mesh[] = [];
    const radius = event.skillId === 'skill-h03W' ? 7
      : event.skillId === 'skill-h03X' ? 10
        : event.skillId === 'skill-h01I' ? 8.5
          : event.skillId === 'skill-h01J' ? 9.5 : 11;
    const ring = this.add(meshes, MeshBuilder.CreateTorus('divine-warning',
      { diameter: radius * 2, thickness: reduced ? .08 : .14, tessellation: 48 }, this.scene), this.pale);
    ring.position.set(at.x, .08, at.z);
    this.timedEffect(meshes, event.windup ?? .35);
    debug('visual.divine.cast', { skillId: event.skillId, eventId: event.id, reduced });
  }

  show(event: GameEvent, at: Vector3, reduced: boolean): void {
    const id = event.skillId;
    if (!id) return;
    const meshes: Mesh[] = [];
    if (id === 'skill-h03W') {
      // The persistent 24-pearl cage is driven by the server ground snapshot.
      this.sphere(meshes, at.add(new Vector3(0, 1.7, 0)), reduced ? 1.6 : 2.4, this.pale);
    } else if (id === 'skill-h03X') {
      const trunk = this.add(meshes, MeshBuilder.CreateCylinder('bodhi-trunk',
        { height: 5, diameterBottom: .75, diameterTop: .38, tessellation: 7 }, this.scene), this.stone);
      trunk.position.set(at.x, 2.55, at.z);
      for (let i = 0; i < (reduced ? 5 : 9); i++) {
        const theta = i * Math.PI * 2 / (reduced ? 5 : 9);
        const crown = this.sphere(meshes, new Vector3(at.x + Math.cos(theta) * 2.4,
          4.5 + (i % 3) * .25, at.z + Math.sin(theta) * 1.5), 2.8, this.leaf);
        crown.scaling.y = .55;
      }
    } else if (id === 'skill-h01I') {
      for (let i = 0; i < (reduced ? 5 : 10); i++) {
        const angle = (i / (reduced ? 5 : 10)) * Math.PI * 2;
        this.sphere(meshes, new Vector3(at.x + Math.cos(angle) * 4, 3.5,
          at.z + Math.sin(angle) * 2), reduced ? .8 : 1.1, this.fire);
      }
      for (const angle of [Math.PI / 4, -Math.PI / 4]) {
        const slash = this.add(meshes, MeshBuilder.CreateBox('solar-cross-sword',
          { width: 9, height: .12, depth: .34 }, this.scene), this.gold);
        slash.position.set(at.x, .25, at.z);
        slash.rotation.y = angle;
      }
    } else if (id === 'skill-h01J') {
      const palm = this.add(meshes, MeshBuilder.CreateBox('buddha-gold-palm',
        { width: 3.5, height: .7, depth: 4.2 }, this.scene), this.gold);
      palm.position.set(at.x, 8, at.z);
      for (let i = 0; i < 5; i++) {
        const finger = this.add(meshes, MeshBuilder.CreateCylinder('buddha-finger',
          { height: 3.2 + (2 - Math.abs(i - 2)) * .35, diameter: .62, tessellation: 10 }, this.scene), this.gold);
        finger.rotation.x = Math.PI / 2;
        finger.position.set(at.x + (i - 2) * .76, 8, at.z + 3.1);
      }
      this.timedEffect(meshes, reduced ? .32 : .65, true);
      debug('visual.divine.impact', { skillId: id, eventId: event.id, reduced });
      return;
    } else if (id === 'skill-h014') {
      for (let i = -1; i <= 1; i++) {
        const fissure = this.add(meshes, MeshBuilder.CreateBox('chaos-space-tear',
          { width: .42, height: .07, depth: 22 }, this.scene), i === 0 ? this.pale : this.void);
        fissure.position.set(at.x + i * 1.8, .17, at.z);
        fissure.rotation.y = i * .08;
      }
    } else if (id === 'shield-h03W' || id === 'shield-h01J') {
      const shell = this.sphere(meshes, at.add(new Vector3(0, 1.3, 0)), 3.4, this.pale);
      shell.scaling.y = 1.15;
    } else if (id === 'blessing-h03X' || id === 'blessing-h014') {
      this.sphere(meshes, at.add(new Vector3(0, 2.2, 0)), 1.2,
        id === 'blessing-h03X' ? this.leaf : this.pale);
    } else if (id === 'reflect-h03W' || id === 'crow-burst-h01I') {
      this.sphere(meshes, at.add(new Vector3(0, .6, 0)), 2.5,
        id === 'reflect-h03W' ? this.pale : this.fire);
    } else if (id === 'trait-h03W') {
      const lamp = this.add(meshes, MeshBuilder.CreateCylinder('lingjiu-lamp',
        { height: .65, diameterBottom: .8, diameterTop: .45, tessellation: 8 }, this.scene), this.gold);
      lamp.position.set(at.x, .65, at.z);
      const flame = this.add(meshes, MeshBuilder.CreateCylinder('white-lamp-flame',
        { height: 1.1, diameterBottom: .5, diameterTop: 0, tessellation: 7 }, this.scene), this.pale);
      flame.position.set(at.x, 1.5, at.z);
    } else if (id === 'trait-h03X') {
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2;
        const leaf = this.sphere(meshes, new Vector3(at.x + Math.cos(angle) * .6,
          .45, at.z + Math.sin(angle) * .6), .95, this.leaf);
        leaf.scaling.set(.6, .12, 1);
        leaf.rotation.y = angle;
      }
    } else if (id === 'trait-h01I') {
      // Single-target strike: a short focused slash on the one target, not a sweep.
      const sword = this.add(meshes, MeshBuilder.CreateBox('solar-sword-arc',
        { width: 1.9, height: .12, depth: .42 }, this.scene), this.fire);
      sword.position.set(at.x, .45, at.z);
      sword.rotation.y = Math.PI / 4;
    } else if (id === 'trait-h01J') {
      const palm = this.add(meshes, MeshBuilder.CreateBox('buddha-palm-seal',
        { width: 1.8, height: .2, depth: 2.2 }, this.scene), this.gold);
      palm.position.set(at.x, .45, at.z);
      for (let i = 0; i < 5; i++) {
        const finger = this.add(meshes, MeshBuilder.CreateBox('buddha-palm-finger',
          { width: .28, height: .2, depth: .9 }, this.scene), this.gold);
        finger.position.set(at.x + (i - 2) * .36, .45, at.z + 1.35);
      }
    } else if (id === 'trait-h014') {
      for (let i = -1; i <= 1; i++) {
        const tear = this.add(meshes, MeshBuilder.CreateBox('primordial-air-tear',
          { width: .17, height: .12, depth: 3.4 }, this.scene), i === 0 ? this.pale : this.void);
        tear.position.set(at.x + i * .5, .42, at.z);
      }
    } else return;
    this.timedEffect(meshes, reduced ? .3 : .8);
    debug('visual.divine.impact', { skillId: id, eventId: event.id, reduced });
  }

  markZone(id: string, kind: 'lantern-cage' | 'five-finger', at: Vector3, radius: number,
    remaining: number, reduced: boolean): void {
    let entry = this.ground.get(id);
    if (!entry) {
      if (this.ground.size >= 8) return;
      const meshes: Mesh[] = [];
      if (kind === 'lantern-cage') {
        const count = reduced ? 12 : 24;
        for (let i = 0; i < count; i++) {
          const angle = i * Math.PI * 2 / count;
          this.sphere(meshes, new Vector3(at.x + Math.cos(angle) * radius,
            .7 + (i % 2) * .18, at.z + Math.sin(angle) * radius), .72, i % 3 ? this.gold : this.pale);
        }
      } else {
        for (let i = 0; i < 5; i++) {
          const finger = this.add(meshes, MeshBuilder.CreateCylinder('five-finger-mountain',
            { height: 2.8 + (i === 2 ? 1.1 : 0), diameterBottom: 1.8,
              diameterTop: .28, tessellation: 7 }, this.scene), this.stone);
          finger.position.set(at.x + (i - 2) * 1.65, 1.4, at.z + Math.abs(i - 2) * .55);
        }
      }
      entry = { meshes, touched: true };
      this.ground.set(id, entry);
      debug('visual.divine.zone.start', { id, kind, reduced });
    }
    entry.touched = true;
    for (const mesh of entry.meshes) mesh.visibility = Math.min(1, remaining / .4);
  }

  markAura(id: string, kind: Aura['kind'], at: Vector3): void {
    const key = `${kind}:${id}`;
    let entry = this.auras.get(key);
    if (!entry) {
      if (this.auras.size >= 40) return;
      const meshes: Mesh[] = [];
      if (kind === 'solar') {
        for (let i = 0; i < 3; i++) this.sphere(meshes, at.clone(), .9, this.fire);
      } else if (kind === 'lantern' || kind === 'buddha') {
        const shell = this.sphere(meshes, at.clone(), 3.2, this.shield);
        shell.scaling.y = 1.2;
      } else if (kind === 'bodhi') {
        for (let i = 0; i < 3; i++) {
          const leaf = this.sphere(meshes, at.clone(), .58, this.leaf);
          leaf.scaling.y = .2;
        }
      } else if (kind === 'cloud') {
        for (let i = 0; i < 3; i++) {
          const cloud = this.sphere(meshes, at.clone(), .9, this.pale);
          cloud.scaling.y = .35;
        }
      } else {
        for (let i = 0; i < 3; i++) {
          const tear = this.add(meshes, MeshBuilder.CreateBox('primordial-mark-tear',
            { width: .13, height: .9, depth: .13 }, this.scene), this.void);
          tear.position.copyFrom(at);
        }
      }
      entry = { meshes, touched: true, kind, at: at.clone() };
      this.auras.set(key, entry);
      debug('visual.divine.aura.start', { id, kind });
    }
    entry.at.copyFrom(at);
    entry.touched = true;
  }

  tick(dt: number): void {
    this.elapsed += dt;
    for (let i = this.timed.length - 1; i >= 0; i--) {
      const item = this.timed[i];
      item.remaining -= dt;
      const progress = Math.max(0, 1 - item.remaining / item.duration);
      if (item.hand) for (const mesh of item.meshes) mesh.position.y -= dt * 11;
      for (const mesh of item.meshes) mesh.visibility = progress > .7 ? (1 - progress) / .3 : 1;
      if (item.remaining <= 0) { this.release(item.meshes); this.timed.splice(i, 1); }
    }
    for (const [id, entry] of this.ground) {
      if (!entry.touched) { this.release(entry.meshes); this.ground.delete(id); }
      else entry.touched = false;
    }
    for (const [id, entry] of this.auras) {
      if (!entry.touched) { this.release(entry.meshes); this.auras.delete(id); continue; }
      entry.touched = false;
      if (entry.kind === 'solar' || entry.kind === 'bodhi' || entry.kind === 'cloud'
        || entry.kind === 'primordial') {
        const radius = entry.kind === 'solar' ? 2.2 : entry.kind === 'primordial' ? .75 : .8;
        const height = entry.kind === 'solar' ? 1.6 : entry.kind === 'primordial' ? 1.2 : 2.5;
        for (let i = 0; i < entry.meshes.length; i++) {
          const angle = this.elapsed * 2 + i * Math.PI * 2 / 3;
          entry.meshes[i].position.set(entry.at.x + Math.cos(angle) * radius,
            height + Math.sin(this.elapsed * 3 + i) * .12,
            entry.at.z + Math.sin(angle) * radius);
        }
      } else entry.meshes[0].position.set(entry.at.x, 1.45, entry.at.z);
    }
  }

  clear(): void {
    for (const item of this.timed) this.release(item.meshes);
    this.timed.length = 0;
    for (const entry of this.ground.values()) this.release(entry.meshes);
    this.ground.clear();
    for (const entry of this.auras.values()) this.release(entry.meshes);
    this.auras.clear();
  }

  private release(meshes: Mesh[]): void { for (const mesh of meshes) mesh.dispose(); }
}
