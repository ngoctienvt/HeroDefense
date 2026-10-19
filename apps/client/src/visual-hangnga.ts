import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { HANGNGA as H } from '../../../content/hangnga-design.js';
import { debug } from './debug.js';

type Effect = { mesh: Mesh; light?: PointLight; age: number; life: number; kind: 'moon' | 'spark' | 'freeze' };
type Marker = { mesh: Mesh; touched: boolean };

/** Moon silhouettes and blessing rings mirror cast events and haste snapshots. */
export class VisualHangnga {
  private active: Effect[] = [];
  private pools: Record<Effect['kind'], Mesh[]> = { moon: [], spark: [], freeze: [] };
  private lights: PointLight[] = [];
  private blessings = new Map<string, Marker>();
  private blessingPool: Mesh[] = [];
  private moon: StandardMaterial;
  private silver: StandardMaterial;

  constructor(private scene: Scene) {
    const texture = new DynamicTexture('hangnga-crescent-mask', { width: 256, height: 256 }, scene, false);
    const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 256, 256);
    ctx.beginPath(); ctx.arc(124, 128, 92, 0, Math.PI * 2);
    ctx.fillStyle = '#e4f8ff'; ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.arc(164, 96, 84, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; texture.hasAlpha = true; texture.update();
    this.moon = new StandardMaterial('hangnga-ice-jade-moon', scene);
    this.moon.diffuseTexture = texture; this.moon.emissiveTexture = texture;
    this.moon.useAlphaFromDiffuseTexture = true;
    this.moon.emissiveColor = Color3.FromHexString('#91c8d5').scale(.42);
    this.moon.backFaceCulling = false; this.moon.disableDepthWrite = true;
    this.silver = new StandardMaterial('hangnga-silver', scene);
    this.silver.diffuseColor = Color3.FromHexString('#b8dce8');
    this.silver.emissiveColor = Color3.FromHexString('#a8dbea').scale(.35);
    this.silver.alpha = .74; this.silver.disableDepthWrite = true;
  }

  private spawn(kind: Effect['kind'], at: Vector3, life: number, size: number): Effect | undefined {
    if (this.active.length >= 32) return;
    const mesh = this.pools[kind].pop() ?? (kind === 'freeze'
      ? MeshBuilder.CreateCylinder('hangnga-ice-shard', { height: 1, diameterTop: 0, diameterBottom: .45, tessellation: 6 }, this.scene)
      : MeshBuilder.CreatePlane(kind === 'moon' ? 'hangnga-crescent' : 'hangnga-moon-spark', { size: 1 }, this.scene));
    mesh.material = kind === 'freeze' ? this.silver : this.moon;
    mesh.position.copyFrom(at); mesh.scaling.setAll(size); mesh.visibility = 1;
    mesh.isPickable = false; mesh.setEnabled(true);
    if (kind !== 'freeze') mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    const effect: Effect = { mesh, age: 0, life, kind };
    this.active.push(effect); return effect;
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean): void {
    this.spawn('moon', at.add(new Vector3(0, 3.8, 0)), event.windup ?? .25, reduced ? 3.4 : 5.2);
    debug('visual.hangnga.cast', { eventId: event.id });
  }

  ability(event: GameEvent, at: Vector3, reduced: boolean): void {
    const effect = this.spawn('moon', at.add(new Vector3(0, 4.1, 0)), reduced ? .35 : .9, reduced ? 3.8 : 6.4);
    if (!reduced && effect) {
      const light = this.lights.pop() ?? new PointLight('hangnga-cyan-white', at.add(new Vector3(0, 5, 0)), this.scene);
      light.diffuse = Color3.FromHexString('#bde9f1'); light.intensity = .45; light.range = 12;
      light.position.set(at.x, 5, at.z); light.setEnabled(true); effect.light = light;
      for (let i = 0; i < 14; i++) {
        const angle = Math.PI * 2 * i / 14, radius = 2 + (i % 3) * 2.4;
        this.spawn('spark', new Vector3(at.x + Math.cos(angle) * radius, 3.2 + i % 3, at.z + Math.sin(angle) * radius),
          .4 + (i % 4) * .12, .22);
      }
    }
    debug('visual.hangnga.ability', { eventId: event.id, allies: event.targets?.length ?? 0, reduced });
  }

  attack(event: GameEvent, targets: readonly Vector3[], reduced: boolean): void {
    for (const at of targets.slice(0, H.bounceTargets))
      this.spawn('spark', at.add(new Vector3(0, 1.4, 0)), reduced ? .18 : .32, .7);
    debug('visual.hangnga.attack', { eventId: event.id, targets: targets.length });
  }

  freeze(event: GameEvent, targets: readonly Vector3[], reduced: boolean): void {
    for (const at of targets.slice(0, reduced ? 8 : 16))
      this.spawn('freeze', at.add(new Vector3(0, .75, 0)), reduced ? .2 : .55, 1.2);
    debug('visual.hangnga.freeze', { eventId: event.id, targets: targets.length });
  }

  markBlessing(id: string, at: Vector3): void {
    let marker = this.blessings.get(id);
    if (!marker) {
      if (this.blessings.size >= 32) return;
      const mesh = this.blessingPool.pop() ?? MeshBuilder.CreateTorus('hangnga-blessing-ring',
        { diameter: 2.3, thickness: .06, tessellation: 24 }, this.scene);
      mesh.material = this.silver; mesh.isPickable = false; mesh.setEnabled(true);
      marker = { mesh, touched: false }; this.blessings.set(id, marker);
    }
    marker.mesh.position.set(at.x, .07, at.z); marker.touched = true;
  }

  tick(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const effect = this.active[i]; effect.age += dt;
      if (effect.age >= effect.life) {
        effect.mesh.setEnabled(false); this.pools[effect.kind].push(effect.mesh);
        if (effect.light) { effect.light.setEnabled(false); this.lights.push(effect.light); }
        this.active.splice(i, 1); continue;
      }
      effect.mesh.visibility = 1 - effect.age / effect.life;
      if (effect.kind === 'spark') effect.mesh.position.y -= dt * 3;
    }
    for (const [id, marker] of this.blessings) {
      if (marker.touched) marker.touched = false;
      else { marker.mesh.setEnabled(false); this.blessingPool.push(marker.mesh); this.blessings.delete(id); }
    }
  }

  clear(): void {
    for (const effect of this.active) {
      effect.mesh.setEnabled(false); this.pools[effect.kind].push(effect.mesh);
      if (effect.light) { effect.light.setEnabled(false); this.lights.push(effect.light); }
    }
    this.active.length = 0;
    for (const marker of this.blessings.values()) { marker.mesh.setEnabled(false); this.blessingPool.push(marker.mesh); }
    this.blessings.clear();
  }
}
