import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';

type Marker = { root: TransformNode; touched: boolean };
type Pulse = { root: TransformNode; age: number; life: number };

export class VisualFuxi {
  private readonly zones = new Map<string, Marker>();
  private readonly pool: TransformNode[] = [];
  private readonly pulses: Pulse[] = [];
  private readonly jade: StandardMaterial;
  private readonly gold: StandardMaterial;
  private readonly surface: StandardMaterial;

  constructor(private readonly scene: Scene) {
    this.jade = this.material('fuxi-jade', '#3ba58b', .35, .82);
    this.gold = this.material('fuxi-gold', '#dfbd65', .25, .88);
    this.surface = this.material('fuxi-bagua-surface', '#2d8b76', .08, .16);
  }

  private material(name: string, color: string, glow: number, alpha: number): StandardMaterial {
    const result = new StandardMaterial(name, this.scene);
    result.diffuseColor = Color3.FromHexString(color);
    result.emissiveColor = result.diffuseColor.scale(glow);
    result.alpha = alpha; result.backFaceCulling = false; result.disableDepthWrite = true;
    return result;
  }

  private makeBagua(): TransformNode {
    const root = new TransformNode('fuxi-bagua-array', this.scene);
    const disc = MeshBuilder.CreateCylinder('bagua-jade-disc', {
      height: .035, diameter: 19, tessellation: 8,
    }, this.scene);
    disc.parent = root; disc.position.y = .02;
    disc.material = this.surface; disc.isPickable = false;
    for (const [diameter, material] of [[19, this.gold], [12, this.jade], [3.2, this.gold]] as const) {
      const ring = MeshBuilder.CreateTorus('bagua-octagonal-ring', {
        diameter, thickness: .16, tessellation: 8,
      }, this.scene);
      ring.parent = root; ring.position.y = .09;
      ring.material = material; ring.isPickable = false;
    }
    for (let gua = 0; gua < 8; gua++) {
      const angle = gua * Math.PI / 4;
      const cx = Math.cos(angle) * 7.9, cz = Math.sin(angle) * 7.9;
      for (let line = 0; line < 3; line++) {
        const broken = (gua >> line) & 1;
        for (const half of broken ? [-1, 1] : [0]) {
          const bar = MeshBuilder.CreateBox('bagua-trigram-stroke', {
            width: broken ? .61 : 1.45, height: .05, depth: .18,
          }, this.scene);
          bar.parent = root;
          const tangent = line * .48 - .48;
          const split = broken ? half * .39 : 0;
          bar.position.set(cx + Math.cos(angle) * tangent - Math.sin(angle) * split,
            .13, cz + Math.sin(angle) * tangent + Math.cos(angle) * split);
          bar.rotation.y = -angle;
          bar.material = this.gold; bar.isPickable = false;
        }
      }
    }
    return root;
  }

  markZone(id: string, at: Vector3): void {
    let marker = this.zones.get(id);
    if (!marker) {
      if (this.zones.size >= 8) return;
      marker = { root: this.pool.pop() ?? this.makeBagua(), touched: false };
      marker.root.setEnabled(true); this.zones.set(id, marker);
      debug('visual.fuxi.zone.start', { id });
    }
    marker.root.position.copyFrom(at); marker.touched = true;
  }

  cast(event: GameEvent, at: Vector3): void {
    debug('visual.fuxi.cast', { eventId: event.id, x: at.x, z: at.z });
  }

  attack(event: GameEvent, from: Vector3, targets: Vector3[], reduced: boolean): void {
    if (this.pulses.length >= 12 || !targets.length) return;
    const root = new TransformNode('fuxi-guqin-sound-waves', this.scene);
    const points = [from, ...targets.slice(0, reduced ? 2 : 6)];
    for (let i = 1; i < points.length; i++) {
      const start = points[i - 1], end = points[i];
      const dx = end.x - start.x, dz = end.z - start.z;
      const beam = MeshBuilder.CreateBox('fuxi-sound-wave', {
        width: reduced ? .13 : .22, height: .12, depth: Math.hypot(dx, dz),
      }, this.scene);
      beam.parent = root;
      beam.position.set((start.x + end.x) / 2, 1.2, (start.z + end.z) / 2);
      beam.rotation.y = Math.atan2(dx, dz);
      beam.material = this.jade; beam.isPickable = false;
    }
    this.pulses.push({ root, age: 0, life: reduced ? .2 : .38 });
    debug('visual.fuxi.attack', { eventId: event.id, targets: points.length - 1 });
  }

  impact(event: GameEvent, at: Vector3, reduced: boolean): void {
    if (this.pulses.length >= 12) return;
    const root = new TransformNode('fuxi-eight-trigram-focus', this.scene);
    root.position.copyFrom(at);
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const beam = MeshBuilder.CreateBox('fuxi-converging-jade-beam', {
        width: reduced ? .12 : .23, height: .08, depth: 8.1,
      }, this.scene);
      beam.parent = root;
      beam.position.set(Math.cos(angle) * 4.2, .17, Math.sin(angle) * 4.2);
      beam.rotation.y = Math.PI / 2 - angle;
      beam.material = i % 2 ? this.gold : this.jade; beam.isPickable = false;
    }
    this.pulses.push({ root, age: 0, life: reduced ? .22 : .55 });
    debug('visual.fuxi.impact', { eventId: event.id, reduced });
  }

  tick(dt: number): void {
    for (const [id, marker] of this.zones) {
      if (marker.touched) marker.touched = false;
      else { marker.root.setEnabled(false); this.pool.push(marker.root); this.zones.delete(id); }
    }
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i]; pulse.age += dt;
      if (pulse.age >= pulse.life) {
        pulse.root.dispose(false, false); this.pulses.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const marker of this.zones.values()) {
      marker.root.setEnabled(false); this.pool.push(marker.root);
    }
    this.zones.clear();
    for (const pulse of this.pulses) pulse.root.dispose(false, false);
    this.pulses.length = 0;
  }
}
