import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { DOUZHAN as D } from '../../../content/douzhan-design.js';
import { debug } from './debug.js';

type Effect = { mesh: Mesh; kind: 'warning' | 'staff' | 'crack' | 'shadow'; age: number; life: number };
type CloneMarker = { mesh: Mesh; touched: boolean };

/** Solid staff and ground fracture follow the server's lane impact; clones follow snapshots. */
export class VisualDouzhan {
  private active: Effect[] = [];
  private pools: Record<Effect['kind'], Mesh[]> = { warning: [], staff: [], crack: [], shadow: [] };
  private clones = new Map<string, CloneMarker>();
  private clonePool: Mesh[] = [];
  private gold: StandardMaterial;
  private warning: StandardMaterial;
  private crack: StandardMaterial;

  constructor(private scene: Scene) {
    const staffTexture = new DynamicTexture('douzhan-engraved-gold', { width: 512, height: 256 }, scene, false);
    const ctx = staffTexture.getContext() as unknown as CanvasRenderingContext2D;
    ctx.fillStyle = '#9c6021'; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#eebc50';
    for (let x = 0; x < 512; x += 64) ctx.fillRect(x, 0, 22, 256);
    ctx.strokeStyle = '#fff0ac'; ctx.lineWidth = 6;
    for (let x = 34; x < 512; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 28); ctx.lineTo(x + 18, 64); ctx.lineTo(x, 100);
      ctx.lineTo(x + 18, 136); ctx.lineTo(x, 172); ctx.lineTo(x + 18, 208); ctx.stroke();
    }
    staffTexture.update();
    this.gold = new StandardMaterial('douzhan-solid-gold', scene);
    this.gold.diffuseTexture = staffTexture;
    this.gold.emissiveColor = Color3.FromHexString('#b78631').scale(.18);
    this.gold.specularColor = Color3.FromHexString('#ffe8a4');

    this.warning = new StandardMaterial('douzhan-lane-warning', scene);
    this.warning.diffuseColor = Color3.FromHexString('#c67c2a');
    this.warning.emissiveColor = Color3.FromHexString('#e4a442').scale(.28);
    this.warning.alpha = .38; this.warning.disableDepthWrite = true;

    const crackTexture = new DynamicTexture('douzhan-fractured-stone', { width: 256, height: 512 }, scene, false);
    const cracks = crackTexture.getContext() as unknown as CanvasRenderingContext2D;
    cracks.clearRect(0, 0, 256, 512); cracks.strokeStyle = '#3b2b28'; cracks.lineWidth = 9;
    const paths = [[128, 8, 96, 72, 130, 140, 64, 220, 116, 290, 50, 390, 110, 500],
      [122, 100, 188, 128, 152, 205, 230, 270, 174, 340, 220, 450, 165, 508]];
    for (const path of paths) {
      cracks.beginPath(); cracks.moveTo(path[0], path[1]);
      for (let i = 2; i < path.length; i += 2) cracks.lineTo(path[i], path[i + 1]);
      cracks.stroke();
    }
    cracks.strokeStyle = '#bd8347'; cracks.lineWidth = 3;
    for (const path of paths) {
      cracks.beginPath(); cracks.moveTo(path[0], path[1]);
      for (let i = 2; i < path.length; i += 2) cracks.lineTo(path[i], path[i + 1]);
      cracks.stroke();
    }
    crackTexture.hasAlpha = true; crackTexture.update();
    this.crack = new StandardMaterial('douzhan-ground-crack', scene);
    this.crack.diffuseTexture = crackTexture; this.crack.useAlphaFromDiffuseTexture = true;
    this.crack.emissiveColor = Color3.FromHexString('#a26d36').scale(.12);
    this.crack.backFaceCulling = false; this.crack.disableDepthWrite = true;
  }

  private spawn(kind: Effect['kind'], at: Vector3, direction: { x: number; z: number }, life: number): void {
    if (this.active.length >= 24) return;
    const mesh = this.pools[kind].pop() ?? (kind === 'staff'
      ? MeshBuilder.CreateCylinder('douzhan-staff', { height: D.staffLength, diameter: 1.5, tessellation: 24 }, this.scene)
      : kind === 'shadow' ? MeshBuilder.CreateCylinder('douzhan-shadow-staff', { height: 2.8, diameter: .35, tessellation: 12 }, this.scene)
        : MeshBuilder.CreateGround(kind === 'warning' ? 'douzhan-warning' : 'douzhan-crack',
          { width: D.staffWidth, height: D.staffLength }, this.scene));
    mesh.material = kind === 'staff' || kind === 'shadow' ? this.gold : kind === 'warning' ? this.warning : this.crack;
    mesh.isPickable = false; mesh.visibility = 1; mesh.scaling.setAll(1);
    mesh.rotation.set(0, Math.atan2(direction.x, direction.z), 0);
    if (kind === 'staff') mesh.rotation.x = Math.PI / 2;
    mesh.position.set(at.x + direction.x * D.staffLength / 2,
      kind === 'staff' ? 7 : kind === 'shadow' ? 1.4 : kind === 'warning' ? .08 : .09,
      at.z + direction.z * D.staffLength / 2);
    mesh.setEnabled(true);
    this.active.push({ mesh, kind, age: 0, life });
  }

  cast(event: GameEvent, at: Vector3): void {
    this.spawn('warning', at, event.direction ?? { x: 0, z: 1 }, event.windup ?? .25);
    debug('visual.douzhan.cast', { eventId: event.id });
  }

  impact(event: GameEvent, at: Vector3, reduced: boolean): void {
    const direction = event.direction ?? { x: 0, z: 1 };
    if (!reduced) this.spawn('staff', at, direction, .65);
    this.spawn('crack', at, direction, reduced ? .28 : 1.25);
    debug('visual.douzhan.impact', { eventId: event.id, targets: event.targets?.length ?? 0, reduced });
  }

  shadowHit(event: GameEvent, at: Vector3, reduced: boolean): void {
    if (reduced) return;
    this.spawn('shadow', at.add(new Vector3(0, 0, -D.staffLength / 2)), { x: 0, z: 1 }, .24);
    debug('visual.douzhan.shadow', { eventId: event.id, skillId: event.skillId });
  }

  markClone(id: string, at: Vector3): void {
    let marker = this.clones.get(id);
    if (!marker) {
      if (this.clones.size >= 32) return;
      const mesh = this.clonePool.pop() ?? MeshBuilder.CreateTorus('douzhan-clone-seal',
        { diameter: 1.8, thickness: .07, tessellation: 24 }, this.scene);
      mesh.material = this.warning; mesh.isPickable = false; mesh.setEnabled(true);
      marker = { mesh, touched: false }; this.clones.set(id, marker);
      debug('visual.douzhan.clone-start', { id });
    }
    marker.mesh.position.set(at.x, .06, at.z); marker.touched = true;
  }

  tick(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const effect = this.active[i]; effect.age += dt;
      if (effect.age >= effect.life) {
        effect.mesh.setEnabled(false); this.pools[effect.kind].push(effect.mesh);
        this.active.splice(i, 1); continue;
      }
      const t = effect.age / effect.life;
      effect.mesh.visibility = 1 - t;
      if (effect.kind === 'staff') effect.mesh.position.y = .76 + 6.24 * Math.max(0, 1 - t * 3);
    }
    for (const [id, marker] of this.clones) {
      if (marker.touched) { marker.touched = false; continue; }
      marker.mesh.setEnabled(false); this.clonePool.push(marker.mesh); this.clones.delete(id);
      debug('visual.douzhan.clone-end', { id });
    }
  }

  clear(): void {
    for (const effect of this.active) { effect.mesh.setEnabled(false); this.pools[effect.kind].push(effect.mesh); }
    this.active.length = 0;
    for (const marker of this.clones.values()) { marker.mesh.setEnabled(false); this.clonePool.push(marker.mesh); }
    this.clones.clear();
  }
}
