import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { KIMSI as K } from '../../../content/kimsi-design.js';
import { debug } from './debug.js';

type Effect = { mesh: Mesh; kind: 'blade' | 'scar' | 'ring'; age: number; life: number;
  delay: number; fromY: number; toY: number };

/** Golden feather blades and ground cuts timed from confirmed combat events. */
export class VisualKimsi {
  private active: Effect[] = [];
  private pool: Record<Effect['kind'], Mesh[]> = { blade: [], scar: [], ring: [] };
  private feather: StandardMaterial;
  private scar: StandardMaterial;
  private warning: StandardMaterial;

  constructor(private scene: Scene) {
    const feather = new DynamicTexture('kimsi-feather-shape', 128, scene, false);
    const ctx = feather.getContext() as unknown as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 128, 128);
    ctx.beginPath(); ctx.moveTo(64, 3);
    ctx.bezierCurveTo(105, 23, 105, 77, 64, 122);
    ctx.bezierCurveTo(23, 77, 23, 23, 64, 3);
    ctx.fillStyle = '#efae39'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(64, 6); ctx.lineTo(64, 121);
    ctx.strokeStyle = '#fff0a8'; ctx.lineWidth = 5; ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const y = 33 + i * 17;
      ctx.beginPath(); ctx.moveTo(63, y + 12); ctx.lineTo(37 - i, y);
      ctx.moveTo(65, y + 12); ctx.lineTo(91 + i, y);
      ctx.strokeStyle = '#aa5722'; ctx.lineWidth = 2; ctx.stroke();
    }
    feather.hasAlpha = true; feather.update();
    this.feather = new StandardMaterial('kimsi-solid-feather', scene);
    this.feather.diffuseTexture = feather;
    this.feather.emissiveColor = Color3.FromHexString('#e6a443').scale(.25);
    this.feather.useAlphaFromDiffuseTexture = true; this.feather.backFaceCulling = false;
    this.feather.disableDepthWrite = true;

    const slash = new DynamicTexture('kimsi-x-scars', 128, scene, false);
    const draw = slash.getContext() as unknown as CanvasRenderingContext2D;
    draw.clearRect(0, 0, 128, 128);
    draw.lineCap = 'round';
    for (const sign of [-1, 1]) {
      draw.beginPath(); draw.moveTo(20, sign < 0 ? 19 : 109);
      draw.quadraticCurveTo(66, 65 + sign * 9, 111, sign < 0 ? 108 : 18);
      draw.strokeStyle = '#935724'; draw.lineWidth = 12; draw.stroke();
      draw.strokeStyle = '#f4d178'; draw.lineWidth = 3; draw.stroke();
    }
    slash.hasAlpha = true; slash.update();
    this.scar = new StandardMaterial('kimsi-ground-cuts', scene);
    this.scar.diffuseTexture = slash; this.scar.useAlphaFromDiffuseTexture = true;
    this.scar.backFaceCulling = false; this.scar.disableDepthWrite = true;

    this.warning = new StandardMaterial('kimsi-warning-gold', scene);
    this.warning.diffuseColor = Color3.FromHexString('#ddad56');
    this.warning.emissiveColor = Color3.FromHexString('#a17a35').scale(.2);
    this.warning.alpha = .65; this.warning.disableDepthWrite = true;
  }

  private spawn(kind: Effect['kind'], at: Vector3, life: number, delay = 0): Effect | undefined {
    if (this.active.length >= 32) return;
    const mesh = this.pool[kind].pop() ?? (kind === 'ring'
      ? MeshBuilder.CreateTorus('kimsi-storm-radius', { diameter: K.stormRadius * 2,
        thickness: .14, tessellation: 48 }, this.scene)
      : MeshBuilder.CreatePlane(`kimsi-${kind}`, { size: 1 }, this.scene));
    mesh.material = kind === 'blade' ? this.feather : kind === 'scar' ? this.scar : this.warning;
    mesh.position.copyFrom(at); mesh.rotation.set(0, 0, 0);
    mesh.billboardMode = kind === 'blade' ? Mesh.BILLBOARDMODE_ALL : Mesh.BILLBOARDMODE_NONE;
    if (kind === 'scar') mesh.rotation.x = Math.PI / 2;
    mesh.visibility = 1; mesh.isPickable = false; mesh.setEnabled(true);
    const effect = { mesh, kind, age: 0, life, delay, fromY: at.y, toY: at.y };
    this.active.push(effect);
    return effect;
  }

  cast(event: GameEvent, at: Vector3): void {
    const ring = this.spawn('ring', new Vector3(at.x, .08, at.z), event.windup ?? .25);
    ring?.mesh.scaling.setAll(1);
    debug('visual.kimsi.cast', { eventId: event.id });
  }

  attack(event: GameEvent, at: Vector3, reduced: boolean): void {
    if (!reduced) {
      const blade = this.spawn('blade', new Vector3(at.x, 1.4, at.z), .23);
      blade?.mesh.scaling.set(.5, 1.15, 1);
    }
    debug('visual.kimsi.attack', { eventId: event.id, hits: event.targets?.length ?? 0 });
  }

  impact(event: GameEvent, at: Vector3, reduced: boolean): void {
    const count = reduced ? 6 : 24;
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399963, radius = K.stormRadius * Math.sqrt((i + .4) / count);
      const x = at.x + Math.cos(angle) * radius, z = at.z + Math.sin(angle) * radius;
      if (i % 3 === 0) {
        const scar = this.spawn('scar', new Vector3(x, .09, z), .72, i * .016);
        scar?.mesh.scaling.setAll(.9);
      }
      if (!reduced) {
        const blade = this.spawn('blade', new Vector3(x - .65, 4.8 + i % 4, z - .45), .5, i * .016);
        if (blade) {
          blade.toY = .45;
          blade.mesh.scaling.set(.55, 1.45, 1);
        }
      }
    }
    debug('visual.kimsi.impact', { eventId: event.id, targets: event.targets?.length ?? 0, reduced });
  }

  tick(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const fx = this.active[i]; fx.age += dt;
      const progress = (fx.age - fx.delay) / fx.life;
      if (progress < 0) { fx.mesh.visibility = 0; continue; }
      if (progress >= 1) {
        fx.mesh.setEnabled(false); this.pool[fx.kind].push(fx.mesh);
        this.active.splice(i, 1); continue;
      }
      fx.mesh.visibility = 1 - progress * progress;
      if (fx.kind === 'blade') fx.mesh.position.y = fx.fromY + (fx.toY - fx.fromY) * progress * progress;
    }
  }

  clear(): void {
    for (const fx of this.active) { fx.mesh.setEnabled(false); this.pool[fx.kind].push(fx.mesh); }
    this.active.length = 0;
  }
}
