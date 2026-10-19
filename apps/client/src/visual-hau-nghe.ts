import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { HAUNGHE as H } from '../../../content/hau-nghe-design.js';
import { debug } from './debug.js';

type Effect = { mesh: Mesh; kind: 'sun' | 'ring'; age: number; life: number;
  startY: number; endY: number; delay: number };

/** Nine visible solar bodies descend only after the server confirms the strike. */
export class VisualHauNghe {
  private active: Effect[] = [];
  private sunPool: Mesh[] = [];
  private ringPool: Mesh[] = [];
  private sun: StandardMaterial;
  private warning: StandardMaterial;

  constructor(private scene: Scene) {
    const texture = new DynamicTexture('hau-nghe-sun-corona', { width: 256, height: 256 }, scene, false);
    const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 256, 256); ctx.translate(128, 128);
    for (let i = 0; i < 18; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 9);
      ctx.beginPath(); ctx.moveTo(-16, -64);
      ctx.quadraticCurveTo(-15, -97, 0, -116);
      ctx.quadraticCurveTo(17, -94, 16, -64);
      ctx.fillStyle = i % 2 ? '#e05a25' : '#ff9234'; ctx.fill(); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.fillStyle = '#bd3e1b'; ctx.fill();
    ctx.beginPath(); ctx.arc(-13, -13, 51, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd15b'; ctx.fill();
    texture.hasAlpha = true; texture.update();
    this.sun = new StandardMaterial('hau-nghe-solid-sun', scene);
    this.sun.diffuseTexture = texture; this.sun.emissiveTexture = texture;
    this.sun.emissiveColor = Color3.FromHexString('#dc641d').scale(.36);
    this.sun.useAlphaFromDiffuseTexture = true; this.sun.backFaceCulling = false;
    this.sun.disableDepthWrite = true;
    this.warning = new StandardMaterial('hau-nghe-scorch-ring', scene);
    this.warning.diffuseColor = Color3.FromHexString('#7a3525');
    this.warning.emissiveColor = Color3.FromHexString('#e1712c').scale(.16);
    this.warning.alpha = .78; this.warning.disableDepthWrite = true;
  }

  private ring(at: Vector3, life: number, size: number): void {
    if (this.active.length >= 32) return;
    const mesh = this.ringPool.pop() ?? MeshBuilder.CreateTorus('hau-nghe-scorch',
      { diameter: H.blastRadius * 2, thickness: .16, tessellation: 48 }, this.scene);
    mesh.material = this.warning; mesh.position.set(at.x, .08, at.z);
    mesh.scaling.setAll(size / (H.blastRadius * 2)); mesh.visibility = 1;
    mesh.isPickable = false; mesh.setEnabled(true);
    this.active.push({ mesh, kind: 'ring', age: 0, life, startY: .08, endY: .08, delay: 0 });
  }

  cast(event: GameEvent, at: Vector3): void {
    this.ring(at, event.windup ?? .25, 2.8);
    debug('visual.haunghe.cast', { eventId: event.id });
  }

  arrow(event: GameEvent, at: Vector3, reduced: boolean): void {
    if (reduced || this.active.length >= 32) return;
    const mesh = this.sunPool.pop() ?? MeshBuilder.CreatePlane('hau-nghe-solar-arrow', { size: 1 }, this.scene);
    mesh.material = this.sun; mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    mesh.position.set(at.x, 1.3, at.z); mesh.scaling.setAll(1.2);
    mesh.visibility = 1; mesh.isPickable = false; mesh.setEnabled(true);
    this.active.push({ mesh, kind: 'sun', age: 0, life: .28, startY: 1.3, endY: 1.3, delay: 0 });
    debug('visual.haunghe.arrow', { eventId: event.id, hits: event.targets?.length ?? 0 });
  }

  impact(event: GameEvent, at: Vector3, reduced: boolean): void {
    this.ring(at, reduced ? .28 : .85, H.blastRadius * 2);
    if (!reduced) for (let i = 0; i < H.sunCount && this.active.length < 32; i++) {
      const angle = i * Math.PI * 2 / H.sunCount;
      const radius = i === 0 ? 0 : H.blastRadius * (.35 + (i % 3) * .2);
      const mesh = this.sunPool.pop() ?? MeshBuilder.CreatePlane('hau-nghe-nine-suns', { size: 1 }, this.scene);
      mesh.material = this.sun; mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
      mesh.position.set(at.x + Math.cos(angle) * radius, 10 + (i % 3) * 1.5,
        at.z + Math.sin(angle) * radius);
      mesh.scaling.setAll(i === 0 ? 2.4 : 1.8);
      mesh.visibility = 1; mesh.isPickable = false; mesh.setEnabled(true);
      this.active.push({ mesh, kind: 'sun', age: 0, life: .75,
        startY: mesh.position.y, endY: .7, delay: i * .045 });
    }
    debug('visual.haunghe.impact', { eventId: event.id, targets: event.targets?.length ?? 0, reduced });
  }

  tick(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const effect = this.active[i]; effect.age += dt;
      const progress = (effect.age - effect.delay) / effect.life;
      if (progress < 0) { effect.mesh.visibility = 0; continue; }
      if (progress >= 1) {
        effect.mesh.setEnabled(false);
        (effect.kind === 'sun' ? this.sunPool : this.ringPool).push(effect.mesh);
        this.active.splice(i, 1); continue;
      }
      effect.mesh.visibility = 1 - progress * progress;
      if (effect.kind === 'sun') effect.mesh.position.y = effect.startY + (effect.endY - effect.startY) * progress * progress;
    }
  }

  clear(): void {
    for (const effect of this.active) {
      effect.mesh.setEnabled(false); (effect.kind === 'sun' ? this.sunPool : this.ringPool).push(effect.mesh);
    }
    this.active.length = 0;
  }
}
