import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { KIMTHIEN as K } from '../../../content/kimthien-design.js';
import { debug } from './debug.js';

type Bowl = { dome: Mesh; funnel: Mesh; lotus: Mesh; touched: boolean; age: number };
type Pulse = { mesh: Mesh; age: number; life: number };

/** The event marks the impact; active bowl geometry exists only while its server zone does. */
export class VisualKimthien {
  private bowls = new Map<string, Bowl>();
  private pool: Bowl[] = [];
  private pulses: Pulse[] = [];
  private pulsePool: Mesh[] = [];
  private warning: StandardMaterial;
  private gold: StandardMaterial;
  private light: StandardMaterial;
  private lotus: StandardMaterial;

  constructor(private scene: Scene) {
    this.gold = new StandardMaterial('kimthien-gold-bowl', scene);
    this.gold.diffuseColor = Color3.FromHexString('#9f642b');
    this.gold.emissiveColor = Color3.FromHexString('#dbad4a').scale(.18);
    this.gold.specularColor = Color3.FromHexString('#ffe8aa');
    this.gold.alpha = .82; this.gold.backFaceCulling = false;
    this.gold.disableDepthWrite = true;

    this.light = new StandardMaterial('kimthien-emerald-cone', scene);
    this.light.diffuseColor = Color3.FromHexString('#84bd6a');
    this.light.emissiveColor = Color3.FromHexString('#b9e48b').scale(.2);
    this.light.alpha = .16; this.light.backFaceCulling = false;
    this.light.disableDepthWrite = true;

    this.warning = new StandardMaterial('kimthien-warning', scene);
    this.warning.emissiveColor = Color3.FromHexString('#b9d774');
    this.warning.alpha = .52; this.warning.disableDepthWrite = true;

    const texture = new DynamicTexture('kimthien-nine-petal-lotus', { width: 512, height: 512 }, scene, false);
    const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 512, 512);
    ctx.translate(256, 256);
    for (let i = 0; i < 9; i++) {
      ctx.save(); ctx.rotate(i * Math.PI * 2 / 9);
      ctx.beginPath(); ctx.moveTo(0, -72);
      ctx.bezierCurveTo(-36, -126, -40, -194, 0, -224);
      ctx.bezierCurveTo(40, -194, 36, -126, 0, -72);
      ctx.fillStyle = 'rgba(147,190,96,.28)'; ctx.fill();
      ctx.strokeStyle = '#dfc872'; ctx.lineWidth = 6; ctx.stroke(); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, 82, 0, Math.PI * 2);
    ctx.strokeStyle = '#f0d57a'; ctx.lineWidth = 12; ctx.stroke();
    texture.hasAlpha = true; texture.update();
    this.lotus = new StandardMaterial('kimthien-lotus-seal', scene);
    this.lotus.diffuseTexture = texture; this.lotus.useAlphaFromDiffuseTexture = true;
    this.lotus.emissiveColor = Color3.FromHexString('#bfc36b').scale(.12);
    this.lotus.backFaceCulling = false; this.lotus.disableDepthWrite = true;
  }

  private pulse(at: Vector3, life: number, radius = K.zoneRadius): void {
    if (this.pulses.length >= 12) return;
    const mesh = this.pulsePool.pop() ?? MeshBuilder.CreateTorus('kimthien-zone-pulse',
      { diameter: K.zoneRadius * 2, thickness: .09, tessellation: 48 }, this.scene);
    mesh.material = this.warning; mesh.position.set(at.x, .08, at.z);
    mesh.scaling.setAll(radius / K.zoneRadius); mesh.visibility = 1; mesh.isPickable = false; mesh.setEnabled(true);
    this.pulses.push({ mesh, age: 0, life });
  }

  cast(event: GameEvent, at: Vector3): void {
    this.pulse(at, event.windup ?? .25);
    debug('visual.kimthien.cast', { eventId: event.id });
  }

  impact(event: GameEvent, at: Vector3): void {
    this.pulse(at, .45);
    debug('visual.kimthien.impact', { eventId: event.id });
  }

  attack(event: GameEvent, at: Vector3): void {
    this.pulse(at, .28, K.splashRadius);
    debug('visual.kimthien.attack', { eventId: event.id, targets: event.targets?.length ?? 0 });
  }

  markBowl(id: string, at: Vector3, reduced: boolean): void {
    let bowl = this.bowls.get(id);
    if (!bowl) {
      if (this.bowls.size >= 8) return;
      bowl = this.pool.pop() ?? this.createBowl();
      bowl.dome.setEnabled(true); bowl.lotus.setEnabled(true); bowl.funnel.setEnabled(!reduced);
      bowl.age = 0; this.bowls.set(id, bowl);
      debug('visual.kimthien.zone-start', { id });
    }
    bowl.dome.setEnabled(!reduced);
    bowl.funnel.setEnabled(!reduced);
    bowl.lotus.position.set(at.x, .065, at.z);
    bowl.dome.position.set(at.x, 5.1, at.z);
    bowl.funnel.position.set(at.x, 2.8, at.z);
    bowl.touched = true;
  }

  private createBowl(): Bowl {
    const dome = MeshBuilder.CreateSphere('kimthien-inverted-bowl',
      { diameter: K.zoneRadius * 1.5, segments: 24, slice: .5 }, this.scene);
    dome.scaling.y = .3; dome.rotation.x = Math.PI; dome.material = this.gold;
    dome.isPickable = false;
    const funnel = MeshBuilder.CreateCylinder('kimthien-light-funnel',
      { height: 5.5, diameterTop: 1, diameterBottom: K.zoneRadius * 2, tessellation: 32, cap: Mesh.NO_CAP }, this.scene);
    funnel.material = this.light; funnel.isPickable = false;
    const lotus = MeshBuilder.CreateGround('kimthien-nine-petal-zone',
      { width: K.zoneRadius * 2, height: K.zoneRadius * 2 }, this.scene);
    lotus.material = this.lotus; lotus.isPickable = false;
    return { dome, funnel, lotus, touched: false, age: 0 };
  }

  tick(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i]; pulse.age += dt;
      if (pulse.age >= pulse.life) {
        pulse.mesh.setEnabled(false); this.pulsePool.push(pulse.mesh); this.pulses.splice(i, 1);
      } else pulse.mesh.visibility = 1 - pulse.age / pulse.life;
    }
    for (const [id, bowl] of this.bowls) {
      if (!bowl.touched) {
        bowl.dome.setEnabled(false); bowl.funnel.setEnabled(false); bowl.lotus.setEnabled(false);
        this.pool.push(bowl); this.bowls.delete(id);
        debug('visual.kimthien.zone-end', { id });
      } else {
        bowl.touched = false; bowl.age += dt;
        bowl.lotus.rotation.y += dt * .4;
      }
    }
  }

  clear(): void {
    for (const pulse of this.pulses) { pulse.mesh.setEnabled(false); this.pulsePool.push(pulse.mesh); }
    this.pulses.length = 0;
    for (const bowl of this.bowls.values()) {
      bowl.dome.setEnabled(false); bowl.funnel.setEnabled(false); bowl.lotus.setEnabled(false); this.pool.push(bowl);
    }
    this.bowls.clear();
  }
}
