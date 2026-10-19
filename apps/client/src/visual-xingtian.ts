import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';

type Effect = { mesh: Mesh; age: number; life: number; spin: number; scale: number };
type Status = { mesh: Mesh; touched: boolean };

/** The server event starts the blast; the server snapshot keeps immortality visible. */
export class VisualXingtian {
  private active: Effect[] = [];
  private wallPool: Mesh[] = [];
  private ringPool: Mesh[] = [];
  private impactPool: Mesh[] = [];
  private wavePool: Mesh[] = [];
  private statuses = new Map<string, Status>();
  private statusPool: Mesh[] = [];
  private fireTexture: Texture;
  private flame: StandardMaterial;
  private rune: StandardMaterial;
  private warning: StandardMaterial;

  constructor(private scene: Scene) {
    this.fireTexture = new Texture('/assets/vfx-xingtian-fire.webp', scene, false, true,
      Texture.BILINEAR_SAMPLINGMODE,
      () => debug('visual.xingtian.texture-ready'),
      (_message, error) => debug('visual.xingtian.texture-fallback', { error: String(error ?? _message) }));
    this.fireTexture.hasAlpha = true;
    this.flame = new StandardMaterial('xingtian-black-fire', scene);
    this.flame.diffuseTexture = this.fireTexture;
    this.flame.emissiveTexture = this.fireTexture;
    this.flame.emissiveColor = Color3.FromHexString('#b93642').scale(.55);
    this.flame.useAlphaFromDiffuseTexture = true;
    this.flame.alpha = .68;
    this.flame.backFaceCulling = false;
    this.flame.disableDepthWrite = true;

    const runeTexture = new DynamicTexture('xingtian-blood-runes', { width: 512, height: 512 }, scene, false);
    const ctx = runeTexture.getContext() as unknown as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 512, 512);
    ctx.strokeStyle = '#ff4947';
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(256, 256, 214, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 4;
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8;
      const x = 256 + Math.cos(a) * 190, y = 256 + Math.sin(a) * 190;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(-12, -10); ctx.lineTo(0, 14); ctx.lineTo(12, -10);
      ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke(); ctx.restore();
    }
    runeTexture.hasAlpha = true; runeTexture.update();
    this.rune = new StandardMaterial('xingtian-blood-seal', scene);
    this.rune.diffuseTexture = runeTexture;
    this.rune.emissiveTexture = runeTexture;
    this.rune.useAlphaFromDiffuseTexture = true;
    this.rune.backFaceCulling = false;
    this.rune.disableDepthWrite = true;
    this.warning = new StandardMaterial('xingtian-warning', scene);
    this.warning.emissiveColor = Color3.FromHexString('#8f2637');
    this.warning.alpha = .78;
    this.warning.disableDepthWrite = true;
  }

  private acquire(): Mesh {
    const mesh = this.wallPool.pop() ?? MeshBuilder.CreateCylinder('xingtian-fire-vortex', {
      height: 3.8, diameter: 12, tessellation: 48, cap: Mesh.NO_CAP,
    }, this.scene);
    mesh.material = this.flame;
    mesh.isPickable = false;
    mesh.visibility = 1;
    mesh.scaling.setAll(1);
    mesh.setEnabled(true);
    return mesh;
  }

  cast(event: GameEvent, at: Vector3): void {
    if (this.active.length >= 12) return;
    const ring = this.ringPool.pop() ?? MeshBuilder.CreateTorus('xingtian-cast-warning', {
      diameter: 12, thickness: .07, tessellation: 64,
    }, this.scene);
    ring.material = this.warning;
    ring.isPickable = false;
    ring.position.set(at.x, .09, at.z);
    ring.visibility = 1;
    ring.scaling.setAll(1);
    ring.setEnabled(true);
    this.active.push({ mesh: ring, age: 0, life: event.windup ?? .25, spin: 0, scale: 1 });
    debug('visual.xingtian.cast', { eventId: event.id, radius: 6 });
  }

  impact(event: GameEvent, at: Vector3, reduced: boolean): void {
    if (this.active.length >= 12) return;
    if (!reduced && this.active.length < 11) {
      const wall = this.acquire();
      wall.position.set(at.x, 1.9, at.z);
      this.active.push({ mesh: wall, age: 0, life: .82, spin: 7, scale: 1 });
    }
    const pulse = this.impactPool.pop() ?? MeshBuilder.CreateTorus('xingtian-impact-ring', {
      diameter: 12, thickness: .12, tessellation: 64,
    }, this.scene);
    pulse.material = this.warning;
    pulse.position.set(at.x, .11, at.z);
    pulse.visibility = 1;
    pulse.scaling.setAll(1);
    pulse.isPickable = false;
    pulse.setEnabled(true);
    this.active.push({ mesh: pulse, age: 0, life: reduced ? .18 : .48, spin: 0, scale: 1 });
    debug('visual.xingtian.impact', { eventId: event.id, radius: 6, reduced });
  }

  wave(event: GameEvent, at: Vector3): void {
    if (this.active.length >= 12) return;
    const mesh = this.wavePool.pop() ?? MeshBuilder.CreateGround('xingtian-fire-wave', {
      width: 2, height: 6,
    }, this.scene);
    const direction = event.direction ?? { x: 0, z: 1 };
    mesh.material = this.flame;
    mesh.rotation.y = Math.atan2(direction.x, direction.z);
    mesh.position.set(at.x + direction.x * 3, .12, at.z + direction.z * 3);
    mesh.visibility = 1;
    mesh.scaling.setAll(1);
    mesh.isPickable = false;
    mesh.setEnabled(true);
    this.active.push({ mesh, age: 0, life: .38, spin: 0, scale: 1 });
    debug('visual.xingtian.wave', { eventId: event.id });
  }

  markImmortal(id: string, at: Vector3): void {
    let status = this.statuses.get(id);
    if (!status) {
      if (this.statuses.size >= 32) return;
      const mesh = this.statusPool.pop() ?? MeshBuilder.CreatePlane('xingtian-immortal-seal', { size: 3.4 }, this.scene);
      mesh.material = this.rune;
      mesh.rotation.x = Math.PI / 2;
      mesh.isPickable = false;
      mesh.setEnabled(true);
      status = { mesh, touched: false };
      this.statuses.set(id, status);
      debug('visual.xingtian.immortal-start', { id });
    }
    status.mesh.position.set(at.x, .08, at.z);
    status.touched = true;
  }

  tick(dt: number, reduced: boolean): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const effect = this.active[i];
      effect.age += dt;
      if (effect.age >= effect.life) {
        effect.mesh.setEnabled(false);
        if (effect.mesh.name === 'xingtian-impact-ring') this.impactPool.push(effect.mesh);
        else if (effect.mesh.name === 'xingtian-fire-vortex') this.wallPool.push(effect.mesh);
        else if (effect.mesh.name === 'xingtian-fire-wave') this.wavePool.push(effect.mesh);
        else this.ringPool.push(effect.mesh);
        this.active.splice(i, 1);
        continue;
      }
      const t = effect.age / effect.life;
      effect.mesh.visibility = 1 - t * t;
      if (effect.spin && !reduced) effect.mesh.rotation.y += effect.spin * dt;
      effect.mesh.scaling.setAll(effect.scale * (.84 + .16 * Math.sin(t * Math.PI)));
    }
    for (const [id, status] of this.statuses) {
      if (!status.touched) {
        status.mesh.setEnabled(false);
        this.statusPool.push(status.mesh);
        this.statuses.delete(id);
        debug('visual.xingtian.immortal-end', { id });
      } else status.touched = false;
    }
  }

  clear(): void {
    for (const effect of this.active) {
      effect.mesh.setEnabled(false);
      if (effect.mesh.name === 'xingtian-impact-ring') this.impactPool.push(effect.mesh);
      else if (effect.mesh.name === 'xingtian-fire-vortex') this.wallPool.push(effect.mesh);
      else if (effect.mesh.name === 'xingtian-fire-wave') this.wavePool.push(effect.mesh);
      else this.ringPool.push(effect.mesh);
    }
    this.active.length = 0;
    for (const status of this.statuses.values()) {
      status.mesh.setEnabled(false);
      this.statusPool.push(status.mesh);
    }
    this.statuses.clear();
  }
}
