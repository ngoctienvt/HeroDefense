import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { KHUONGTU as K } from '../../../content/khuongtu-nha-design.js';
import { debug } from './debug.js';

type Bolt = { mesh: Mesh; age: number; life: number };
type Zone = { ring: Mesh; scroll: Mesh; beam: Mesh; touched: boolean };

/** Scroll, jade prison light and eight discrete lightning impacts. */
export class VisualKhuongTuNha {
  private zones = new Map<string, Zone>();
  private zonePool: Zone[] = [];
  private bolts: Bolt[] = [];
  private boltPool: Mesh[] = [];
  private warning: Bolt[] = [];
  private warningPool: Mesh[] = [];
  private scrollMat: StandardMaterial;
  private boltMat: StandardMaterial;
  private zoneMat: StandardMaterial;
  private coneMat: StandardMaterial;

  constructor(private scene: Scene) {
    const scroll = new DynamicTexture('phong-than-scroll', { width: 256, height: 128 }, scene, false);
    const ctx = scroll.getContext() as unknown as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 256, 128);
    ctx.fillStyle = '#b88838'; ctx.fillRect(18, 14, 220, 100);
    ctx.fillStyle = '#f8e7a9'; ctx.fillRect(25, 20, 206, 88);
    for (const x of [18, 238]) {
      ctx.fillStyle = '#755328'; ctx.fillRect(x - 7, 6, 14, 116);
      ctx.fillStyle = '#f6cb59'; ctx.fillRect(x - 4, 6, 8, 116);
    }
    ctx.fillStyle = '#315f73';
    for (let row = 0; row < 3; row++) for (let col = 0; col < 6; col++) {
      const x = 44 + col * 30, y = 32 + row * 27;
      ctx.fillRect(x, y, 15, 3); ctx.fillRect(x + 4, y + 5, 3, 10);
    }
    scroll.hasAlpha = true; scroll.update();
    this.scrollMat = new StandardMaterial('phong-than-parchment', scene);
    this.scrollMat.diffuseTexture = scroll; this.scrollMat.useAlphaFromDiffuseTexture = true;
    this.scrollMat.backFaceCulling = false; this.scrollMat.disableDepthWrite = true;

    const bolt = new DynamicTexture('ngoc-hu-thunder', { width: 64, height: 256 }, scene, false);
    const draw = bolt.getContext() as unknown as CanvasRenderingContext2D;
    draw.clearRect(0, 0, 64, 256);
    draw.beginPath(); draw.moveTo(28, 0); draw.lineTo(15, 56); draw.lineTo(43, 91);
    draw.lineTo(18, 150); draw.lineTo(38, 193); draw.lineTo(29, 255);
    draw.strokeStyle = '#24718c'; draw.lineWidth = 18; draw.stroke();
    draw.strokeStyle = '#e4f9de'; draw.lineWidth = 7; draw.stroke();
    bolt.hasAlpha = true; bolt.update();
    this.boltMat = new StandardMaterial('ngoc-hu-solid-lightning', scene);
    this.boltMat.diffuseTexture = bolt; this.boltMat.useAlphaFromDiffuseTexture = true;
    this.boltMat.emissiveColor = Color3.FromHexString('#6dbcc2').scale(.45);
    this.boltMat.backFaceCulling = false; this.boltMat.disableDepthWrite = true;

    this.zoneMat = new StandardMaterial('phong-than-boundary', scene);
    this.zoneMat.diffuseColor = Color3.FromHexString('#67aabc');
    this.zoneMat.emissiveColor = Color3.FromHexString('#d4c475').scale(.2);
    this.zoneMat.alpha = .68; this.zoneMat.disableDepthWrite = true;
    this.coneMat = new StandardMaterial('phong-than-jade-prison', scene);
    this.coneMat.diffuseColor = Color3.FromHexString('#6caaad');
    this.coneMat.emissiveColor = Color3.FromHexString('#8ec7ad').scale(.15);
    this.coneMat.alpha = .12; this.coneMat.backFaceCulling = false;
    this.coneMat.disableDepthWrite = true;
  }

  private createZone(): Zone {
    const ring = MeshBuilder.CreateTorus('phong-than-radius',
      { diameter: K.zoneRadius * 2, thickness: .12, tessellation: 48 }, this.scene);
    const scroll = MeshBuilder.CreatePlane('phong-than-scroll', { width: 4.4, height: 2.1 }, this.scene);
    const beam = MeshBuilder.CreateCylinder('phong-than-light',
      { height: 4.2, diameterTop: 2.5, diameterBottom: K.zoneRadius * 2, tessellation: 32 }, this.scene);
    ring.material = this.zoneMat; scroll.material = this.scrollMat; beam.material = this.coneMat;
    scroll.billboardMode = Mesh.BILLBOARDMODE_ALL;
    ring.isPickable = scroll.isPickable = beam.isPickable = false;
    return { ring, scroll, beam, touched: false };
  }

  mark(id: string, at: Vector3, reduced: boolean): void {
    let zone = this.zones.get(id);
    if (!zone) {
      if (this.zones.size >= 8) return;
      zone = this.zonePool.pop() ?? this.createZone(); this.zones.set(id, zone);
      zone.ring.setEnabled(true); zone.scroll.setEnabled(!reduced); zone.beam.setEnabled(!reduced);
    }
    zone.touched = true;
    zone.ring.position.set(at.x, .06, at.z);
    zone.scroll.position.set(at.x, 4.4, at.z);
    zone.beam.position.set(at.x, 2.1, at.z);
    zone.scroll.setEnabled(!reduced); zone.beam.setEnabled(!reduced);
  }

  cast(event: GameEvent, at: Vector3): void {
    const mesh = this.warningPool.pop() ?? MeshBuilder.CreateTorus('phong-than-warning',
      { diameter: K.zoneRadius * 2, thickness: .18, tessellation: 48 }, this.scene);
    mesh.material = this.zoneMat; mesh.position.set(at.x, .07, at.z);
    mesh.isPickable = false; mesh.setEnabled(true); mesh.visibility = 1;
    this.warning.push({ mesh, age: 0, life: event.windup ?? .25 });
    debug('visual.khuongtu.cast', { eventId: event.id });
  }

  impact(event: GameEvent): void {
    debug('visual.khuongtu.impact', { eventId: event.id, targets: event.targets?.length ?? 0 });
  }

  bolt(event: GameEvent, at: Vector3, reduced: boolean): void {
    if (this.bolts.length >= 16) return;
    const mesh = this.boltPool.pop() ?? MeshBuilder.CreatePlane('ngoc-hu-bolt',
      { width: 1.1, height: 5.5 }, this.scene);
    mesh.material = this.boltMat; mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    mesh.position.set(at.x, 2.75, at.z); mesh.visibility = 1;
    mesh.isPickable = false; mesh.setEnabled(true);
    this.bolts.push({ mesh, age: 0, life: reduced ? .16 : .32 });
    debug('visual.khuongtu.bolt', { eventId: event.id, target: event.target });
  }

  tick(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (const [items, pool] of [[this.bolts, this.boltPool], [this.warning, this.warningPool]] as const) {
      for (let i = items.length - 1; i >= 0; i--) {
        const fx = items[i]; fx.age += dt;
        if (fx.age >= fx.life) {
          fx.mesh.setEnabled(false); pool.push(fx.mesh); items.splice(i, 1);
        } else fx.mesh.visibility = 1 - fx.age / fx.life;
      }
    }
    for (const [id, zone] of this.zones) {
      if (zone.touched) { zone.touched = false; continue; }
      zone.ring.setEnabled(false); zone.scroll.setEnabled(false); zone.beam.setEnabled(false);
      this.zonePool.push(zone); this.zones.delete(id);
    }
  }

  clear(): void {
    for (const [items, pool] of [[this.bolts, this.boltPool], [this.warning, this.warningPool]] as const) {
      for (const fx of items) { fx.mesh.setEnabled(false); pool.push(fx.mesh); }
      items.length = 0;
    }
    for (const zone of this.zones.values()) {
      zone.ring.setEnabled(false); zone.scroll.setEnabled(false); zone.beam.setEnabled(false);
      this.zonePool.push(zone);
    }
    this.zones.clear();
  }
}
