import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';

type Marker = { root: TransformNode; touched: boolean };
type Flight = { root: TransformNode; start: Vector3; end: Vector3; age: number; life: number };
type Pulse = { root: TransformNode; age: number; life: number };

export class VisualPhuongHoang {
  private readonly carpets = new Map<string, Marker>();
  private readonly eggs = new Map<string, Marker>();
  private readonly carpetPool: TransformNode[] = [];
  private readonly eggPool: TransformNode[] = [];
  private readonly flights: Flight[] = [];
  private readonly pulses: Pulse[] = [];
  private readonly red: StandardMaterial;
  private readonly gold: StandardMaterial;
  private readonly jade: StandardMaterial;
  private readonly bird: StandardMaterial;

  constructor(private readonly scene: Scene) {
    this.red = this.material('phoenix-ember', '#a82b19', .16, .62);
    this.gold = this.material('phoenix-flame', '#ffbd45', .3, .72);
    this.jade = this.material('phoenix-life', '#38b989', .18, .55);
    this.bird = this.material('phoenix-bird-form', '#ffffff', .07, .9);
    const texture = new Texture('/assets/vfx-phoenix-bird.webp', scene, false, true,
      Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.phoenix.bird.ready', {}),
      (_message, error) => debug('visual.phoenix.bird.error', { message: String(error ?? 'load failed') }));
    texture.hasAlpha = true; this.bird.diffuseTexture = texture;
    this.bird.useAlphaFromDiffuseTexture = true;
  }

  private material(name: string, color: string, glow: number, alpha: number): StandardMaterial {
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = Color3.FromHexString(color);
    material.emissiveColor = material.diffuseColor.scale(glow);
    material.alpha = alpha; material.backFaceCulling = false;
    material.disableDepthWrite = true;
    return material;
  }

  private makeCarpet(): TransformNode {
    const root = new TransformNode('phoenix-life-fire-carpet', this.scene);
    const ground = MeshBuilder.CreateCylinder('red-ember-ground', {
      height: .035, diameter: 18, tessellation: 48,
    }, this.scene);
    ground.parent = root; ground.position.y = .025;
    ground.material = this.red; ground.isPickable = false;
    const ring = MeshBuilder.CreateTorus('green-life-flame-edge', {
      diameter: 17.5, thickness: .22, tessellation: 48,
    }, this.scene);
    ring.parent = root; ring.position.y = .08;
    ring.material = this.jade; ring.isPickable = false;
    for (let i = 0; i < 18; i++) {
      const angle = i * Math.PI * 2 / 18;
      const radius = i % 3 === 0 ? 3.5 : i % 3 === 1 ? 6 : 8;
      const flame = MeshBuilder.CreateCylinder('golden-fire-tongue', {
        height: i % 2 ? 1.1 : 1.5, diameterBottom: .65,
        diameterTop: .02, tessellation: 5,
      }, this.scene);
      flame.parent = root;
      flame.position.set(Math.cos(angle) * radius, .44, Math.sin(angle) * radius);
      flame.rotation.z = Math.sin(angle) * .24;
      flame.material = i % 4 === 0 ? this.jade : this.gold;
      flame.isPickable = false;
    }
    return root;
  }

  private makeEgg(): TransformNode {
    const root = new TransformNode('phoenix-rebirth-egg', this.scene);
    const shell = MeshBuilder.CreateSphere('phoenix-gold-egg-shell', {
      diameter: 1.8, segments: 12,
    }, this.scene);
    shell.parent = root; shell.position.y = 1.1;
    shell.scaling.set(.85, 1.35, .85);
    shell.material = this.gold; shell.isPickable = false;
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      const flame = MeshBuilder.CreateCylinder('egg-red-flame', {
        height: 1.6, diameterBottom: .45, diameterTop: .03, tessellation: 5,
      }, this.scene);
      flame.parent = root; flame.position.set(Math.cos(a) * 1.15, .55, Math.sin(a) * 1.15);
      flame.material = this.red; flame.isPickable = false;
    }
    return root;
  }

  private mark(map: Map<string, Marker>, pool: TransformNode[],
    make: () => TransformNode, cap: number, id: string, at: Vector3): void {
    let marker = map.get(id);
    if (!marker) {
      if (map.size >= cap) return;
      marker = { root: pool.pop() ?? make(), touched: false };
      marker.root.setEnabled(true); map.set(id, marker);
    }
    marker.root.position.copyFrom(at); marker.touched = true;
  }

  markCarpet(id: string, at: Vector3): void {
    this.mark(this.carpets, this.carpetPool, () => this.makeCarpet(), 8, id, at);
  }

  markEgg(id: string, at: Vector3): void {
    this.mark(this.eggs, this.eggPool, () => this.makeEgg(), 8, id, at);
  }

  cast(event: GameEvent, at: Vector3): void {
    debug('visual.phoenix.cast', { eventId: event.id, x: at.x, z: at.z });
  }

  attack(event: GameEvent, at: Vector3, reduced: boolean): void {
    this.pulse(at, reduced ? 1 : 2.8, reduced ? .15 : .3, this.gold);
    debug('visual.phoenix.feather', { eventId: event.id });
  }

  impact(event: GameEvent, at: Vector3, from: Vector3, reduced: boolean): void {
    this.pulse(at, 9, reduced ? .2 : .5, this.gold);
    if (!reduced && this.flights.length < 4) {
      const root = new TransformNode('phoenix-full-bird-sweep', this.scene);
      const plane = MeshBuilder.CreatePlane('phoenix-bird-image', {
        width: 10, height: 7.3,
      }, this.scene);
      plane.parent = root; plane.position.y = 4;
      plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
      plane.material = this.bird; plane.isPickable = false;
      const start = from.clone(); start.z -= 11;
      const end = at.clone(); end.z += 11;
      root.position.copyFrom(start);
      this.flights.push({ root, start, end, age: 0, life: .8 });
    }
    debug('visual.phoenix.sweep', { eventId: event.id, reduced });
  }

  rebirth(event: GameEvent, at: Vector3, reduced: boolean): void {
    this.pulse(at, 5, reduced ? .2 : .55, this.jade);
    debug('visual.phoenix.rebirth', { eventId: event.id });
  }

  private pulse(at: Vector3, radius: number, life: number, material: StandardMaterial): void {
    if (this.pulses.length >= 16) return;
    const root = new TransformNode('phoenix-ring-pulse', this.scene);
    root.position.copyFrom(at);
    const ring = MeshBuilder.CreateTorus('phoenix-flame-wave', {
      diameter: radius * 2, thickness: .3, tessellation: 40,
    }, this.scene);
    ring.parent = root; ring.position.y = .12;
    ring.material = material; ring.isPickable = false;
    this.pulses.push({ root, age: 0, life });
  }

  private sweepMarkers(map: Map<string, Marker>, pool: TransformNode[]): void {
    for (const [id, marker] of map) {
      if (marker.touched) marker.touched = false;
      else { marker.root.setEnabled(false); pool.push(marker.root); map.delete(id); }
    }
  }

  tick(dt: number): void {
    this.sweepMarkers(this.carpets, this.carpetPool);
    this.sweepMarkers(this.eggs, this.eggPool);
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const flight = this.flights[i]; flight.age += dt;
      flight.root.position.copyFrom(Vector3.Lerp(flight.start, flight.end,
        Math.min(1, flight.age / flight.life)));
      if (flight.age >= flight.life) {
        flight.root.dispose(false, false); this.flights.splice(i, 1);
      }
    }
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i]; pulse.age += dt;
      if (pulse.age >= pulse.life) {
        pulse.root.dispose(false, false); this.pulses.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const marker of this.carpets.values()) {
      marker.root.setEnabled(false); this.carpetPool.push(marker.root);
    }
    this.carpets.clear();
    for (const marker of this.eggs.values()) {
      marker.root.setEnabled(false); this.eggPool.push(marker.root);
    }
    this.eggs.clear();
    for (const flight of this.flights) flight.root.dispose(false, false);
    this.flights.length = 0;
    for (const pulse of this.pulses) pulse.root.dispose(false, false);
    this.pulses.length = 0;
  }
}
