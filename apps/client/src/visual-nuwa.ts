import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';

type Crystal = { mesh: Mesh; age: number; life: number; from?: Vector3; to?: Vector3 };
type Marker = { meshes: Mesh[]; touched: boolean };
const COLORS = ['#e66f78', '#ebbe72', '#94dfb2', '#79c9e8', '#ba9be9'];

/** Five material-colored crystals and a portrait ghost, driven by confirmed combat events. */
export class VisualNuwa {
  private active: Crystal[] = [];
  private pool: Mesh[] = [];
  private markers = new Map<string, Marker>();
  private markerPool: Mesh[][] = [];
  private readonly materials: StandardMaterial[];
  private readonly ghostMaterial: StandardMaterial;

  constructor(private scene: Scene) {
    this.materials = COLORS.map((hex, index) => {
      const material = new StandardMaterial(`nuwa-crystal-${index}`, scene);
      material.diffuseColor = Color3.FromHexString(hex);
      material.emissiveColor = material.diffuseColor.scale(.28);
      material.alpha = .78; material.backFaceCulling = false; material.disableDepthWrite = true;
      return material;
    });
    const portrait = new Texture('/assets/hero-portrait-h01C.webp', scene, false, true,
      Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.nuwa.ghost.ready'),
      (_message, error) => debug('visual.nuwa.ghost.error', { message: String(error ?? 'load failed') }));
    portrait.hasAlpha = true;
    this.ghostMaterial = new StandardMaterial('nuwa-creator-ghost', scene);
    this.ghostMaterial.diffuseTexture = portrait;
    this.ghostMaterial.useAlphaFromDiffuseTexture = true;
    this.ghostMaterial.emissiveColor = Color3.FromHexString('#8acac0').scale(.14);
    this.ghostMaterial.alpha = .38;
    this.ghostMaterial.backFaceCulling = false;
    this.ghostMaterial.disableDepthWrite = true;
  }

  private crystal(at: Vector3, color: number, size: number, life: number, from?: Vector3): void {
    if (this.active.length >= 48) return;
    const mesh = this.pool.pop() ?? MeshBuilder.CreatePolyhedron('nuwa-five-color-stone',
      { type: 1, size: 1 }, this.scene);
    mesh.material = this.materials[color % COLORS.length];
    mesh.position.copyFrom(from ?? at); mesh.scaling.set(size * .65, size, size * .65);
    mesh.visibility = 1; mesh.isPickable = false; mesh.setEnabled(true);
    this.active.push({ mesh, age: 0, life, from: from?.clone(), to: from ? at.clone() : undefined });
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean): void {
    if (!reduced && this.active.length < 46) {
      const mesh = MeshBuilder.CreatePlane('nuwa-creator-apparition', { width: 7, height: 7 }, this.scene);
      mesh.material = this.ghostMaterial; mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
      mesh.position.set(at.x, 7, at.z); mesh.isPickable = false;
      this.active.push({ mesh, age: 0, life: .75 });
    }
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5;
      this.crystal(new Vector3(at.x + Math.cos(angle) * 1.8, 3.8, at.z + Math.sin(angle) * 1.8),
        i, reduced ? .45 : .85, event.windup ?? .25);
    }
    this.crystal(new Vector3(at.x, 4.9, at.z), 2, reduced ? 1.4 : 2.8,
      event.windup ?? .25);
    debug('visual.nuwa.cast', { eventId: event.id, reduced });
  }

  attack(event: GameEvent, from: Vector3, targets: readonly Vector3[], reduced: boolean): void {
    for (const [index, at] of targets.slice(0, reduced ? 5 : 15).entries())
      this.crystal(at.clone().addInPlace(new Vector3(0, 1.2, 0)), index, reduced ? .35 : .6,
        reduced ? .16 : .3, from.clone().addInPlace(new Vector3(0, 2.1, 0)));
    debug('visual.nuwa.attack', { eventId: event.id, targets: targets.length });
  }

  impact(event: GameEvent, at: Vector3, targets: readonly Vector3[], reduced: boolean): void {
    const points = targets.length ? targets : [at];
    this.crystal(new Vector3(at.x, 4.2, at.z), 2, reduced ? 1.8 : 3.8,
      reduced ? .25 : .55);
    for (const [index, point] of points.slice(0, reduced ? 12 : 24).entries()) {
      this.crystal(point.clone().addInPlace(new Vector3(0, 1.1, 0)), index, reduced ? .55 : 1.15,
        reduced ? .3 : .75);
      if (!reduced) this.crystal(point.clone().addInPlace(new Vector3(0, 2.2, 0)), index + 2, .48, .65);
    }
    debug('visual.nuwa.impact', { eventId: event.id, targets: points.length, reduced });
  }

  blessing(event: GameEvent, targets: readonly Vector3[], reduced: boolean): void {
    for (const [index, at] of targets.slice(0, reduced ? 12 : 30).entries()) {
      for (let facet = 0; facet < (reduced ? 1 : 5); facet++) {
        const angle = facet * Math.PI * 2 / 5;
        this.crystal(new Vector3(at.x + Math.cos(angle) * .9, 2.3, at.z + Math.sin(angle) * .9),
          index + facet, reduced ? .35 : .48, reduced ? .25 : .65);
      }
    }
    debug('visual.nuwa.blessing', { eventId: event.id, allies: targets.length, reduced });
  }

  markShield(id: string, at: Vector3): void {
    let marker = this.markers.get(id);
    if (!marker) {
      if (this.markers.size >= 32) return;
      const meshes = this.markerPool.pop() ?? COLORS.map(() => MeshBuilder.CreatePolyhedron('nuwa-shield-facet',
        { type: 1, size: 1 }, this.scene));
      meshes.forEach((mesh, index) => {
        mesh.material = this.materials[index]; mesh.scaling.set(.42, 1.5, .42);
        mesh.visibility = .44; mesh.isPickable = false; mesh.setEnabled(true);
      });
      marker = { meshes, touched: false }; this.markers.set(id, marker);
    }
    marker.meshes.forEach((mesh, index) => {
      const angle = index * Math.PI * 2 / COLORS.length;
      mesh.position.set(at.x + Math.cos(angle) * 1.2, 1.3, at.z + Math.sin(angle) * 1.2);
    });
    marker.touched = true;
  }

  tick(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const effect = this.active[i]; effect.age += dt;
      if (effect.age >= effect.life) {
        if (effect.mesh.material === this.ghostMaterial) effect.mesh.dispose();
        else { effect.mesh.setEnabled(false); this.pool.push(effect.mesh); }
        this.active.splice(i, 1); continue;
      }
      const phase = effect.age / effect.life;
      if (effect.from && effect.to) effect.mesh.position.copyFrom(Vector3.Lerp(effect.from, effect.to, phase));
      effect.mesh.rotation.y += dt * 2;
      effect.mesh.visibility = 1 - phase * .8;
    }
    for (const [id, marker] of this.markers) {
      if (marker.touched) marker.touched = false;
      else { marker.meshes.forEach(mesh => mesh.setEnabled(false)); this.markerPool.push(marker.meshes); this.markers.delete(id); }
    }
  }

  clear(): void {
    for (const effect of this.active) {
      if (effect.mesh.material === this.ghostMaterial) effect.mesh.dispose();
      else { effect.mesh.setEnabled(false); this.pool.push(effect.mesh); }
    }
    this.active.length = 0;
    for (const marker of this.markers.values()) {
      marker.meshes.forEach(mesh => mesh.setEnabled(false)); this.markerPool.push(marker.meshes);
    }
    this.markers.clear();
  }
}
