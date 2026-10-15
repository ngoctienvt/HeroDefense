import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { SpriteManager } from '@babylonjs/core/Sprites/spriteManager.js';
import { debug } from './debug.js';

type WaterImpact = { surface: Mesh; rim: Mesh; splash: Mesh; prison: Sprite; age: number; duration: number; radius: number };
const MAX_WATER_IMPACTS = 4;
const PRISON_FRAMES = 16;

export function waterPrisonFrame(age: number, duration: number): number {
  if (age < .4) return Math.min(4, Math.floor(age / .4 * 5));
  const remaining = duration - age;
  if (remaining < .35) return Math.min(PRISON_FRAMES - 1, 12 + Math.floor((.35 - remaining) / .35 * 4));
  return 4 + Math.floor((age - .4) * 12) % 8;
}

function waterSurfaceTexture(scene: Scene): DynamicTexture {
  const texture = new DynamicTexture('water-whirlpool-texture', { width: 256, height: 256 }, scene, false);
  const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, 256, 256);
  const water = ctx.createRadialGradient(128, 128, 8, 128, 128, 126);
  water.addColorStop(0, 'rgba(2,45,80,.88)');
  water.addColorStop(.38, 'rgba(4,112,163,.74)');
  water.addColorStop(.78, 'rgba(11,164,207,.57)');
  water.addColorStop(.96, 'rgba(110,235,246,.43)');
  water.addColorStop(1, 'rgba(110,235,246,0)');
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, 256, 256);
  // The long ability uses the Blender wall; short water hits keep only a soft pool.
  for (let i = 0; i < 22; i++) {
    const angle = i * 2.39996;
    const r = 39 + (i % 6) * 14;
    ctx.fillStyle = i % 3 ? 'rgba(221,255,255,.8)' : 'rgba(73,223,255,.9)';
    ctx.beginPath();
    ctx.arc(128 + Math.cos(angle) * r, 128 + Math.sin(angle) * r, 1.4 + i % 3, 0, Math.PI * 2);
    ctx.fill();
  }
  texture.hasAlpha = true;
  texture.update();
  return texture;
}

function splashTexture(scene: Scene): DynamicTexture {
  const texture = new DynamicTexture('water-splash-texture', { width: 128, height: 128 }, scene, false);
  const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, 128, 128);
  const sheet = ctx.createLinearGradient(0, 125, 0, 11);
  sheet.addColorStop(0, 'rgba(7,108,165,.04)');
  sheet.addColorStop(.28, 'rgba(18,164,219,.58)');
  sheet.addColorStop(.72, 'rgba(95,224,250,.74)');
  sheet.addColorStop(1, 'rgba(228,255,255,.08)');
  ctx.fillStyle = sheet;
  ctx.beginPath();
  ctx.moveTo(7, 122);
  ctx.bezierCurveTo(25, 94, 15, 64, 39, 51);
  ctx.bezierCurveTo(50, 43, 44, 24, 62, 9);
  ctx.bezierCurveTo(54, 51, 80, 47, 89, 70);
  ctx.bezierCurveTo(109, 52, 106, 96, 123, 122);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(221,255,255,.93)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(13, 113);
  ctx.bezierCurveTo(43, 85, 33, 54, 61, 18);
  ctx.stroke();
  texture.hasAlpha = true;
  texture.update();
  return texture;
}

/** Persistent water body and brief splash for Hà Bá's server-confirmed whirlpool. */
export class VisualWater {
  private active: WaterImpact[] = [];
  private pool: WaterImpact[] = [];
  private waterMaterial: StandardMaterial;
  private foamMaterial: StandardMaterial;
  private splashMaterial: StandardMaterial;
  private prisonManager: SpriteManager;
  private droplets: ParticleSystem;

  constructor(private scene: Scene) {
    const waterTexture = waterSurfaceTexture(scene);
    this.waterMaterial = this.material('water-whirlpool', waterTexture);
    this.waterMaterial.zOffset = -2;
    this.foamMaterial = new StandardMaterial('water-foam', scene);
    this.foamMaterial.diffuseColor = Color3.FromHexString('#a7f4ff');
    this.foamMaterial.emissiveColor = Color3.FromHexString('#72dcee');
    this.foamMaterial.alpha = .83;
    this.foamMaterial.disableLighting = true;
    this.foamMaterial.disableDepthWrite = true;
    this.foamMaterial.alphaMode = Engine.ALPHA_COMBINE;
    this.splashMaterial = this.material('water-splash', splashTexture(scene));
    this.prisonManager = new SpriteManager('haba-water-prison', '/assets/vfx-haba-water-prison.webp',
      MAX_WATER_IMPACTS, { width: 256, height: 256 }, scene);
    this.prisonManager.isPickable = false;
    this.prisonManager.texture.hasAlpha = true;
    this.prisonManager.texture.onLoadObservable.addOnce(() => debug('visual.water.prison.ready'));

    const dropletTexture = new DynamicTexture('water-droplet-texture', { width: 32, height: 32 }, scene, false);
    const ctx = dropletTexture.getContext() as unknown as CanvasRenderingContext2D;
    const gradient = ctx.createRadialGradient(13, 12, 1, 16, 16, 15);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(.45, 'rgba(116,232,255,.96)');
    gradient.addColorStop(1, 'rgba(29,143,205,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 32, 32);
    dropletTexture.hasAlpha = true; dropletTexture.update();
    this.droplets = new ParticleSystem('water-impact-droplets', 128, scene);
    this.droplets.particleTexture = dropletTexture;
    this.droplets.emitter = Vector3.Zero();
    this.droplets.createPointEmitter(new Vector3(-1, 1.8, -1), new Vector3(1, 3.6, 1));
    this.droplets.emitRate = 0;
    this.droplets.minLifeTime = .42; this.droplets.maxLifeTime = .85;
    this.droplets.minSize = .14; this.droplets.maxSize = .31;
    this.droplets.minEmitPower = 2.2; this.droplets.maxEmitPower = 4.2;
    this.droplets.gravity = new Vector3(0, -7, 0);
    this.droplets.color1 = new Color4(.43, .85, 1, 1);
    this.droplets.color2 = new Color4(.85, 1, 1, .9);
    this.droplets.colorDead = new Color4(.2, .6, .8, 0);
    this.droplets.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    this.droplets.start();
  }

  impact(at: Vector3, radius: number, duration: number, reduced: boolean): void {
    if (this.active.length >= MAX_WATER_IMPACTS) {
      let victimIndex = 0;
      for (let i = 1; i < this.active.length; i++) {
        const remaining = this.active[i].duration - this.active[i].age;
        const shortest = this.active[victimIndex].duration - this.active[victimIndex].age;
        if (remaining < shortest) victimIndex = i;
      }
      const shortest = this.active[victimIndex].duration - this.active[victimIndex].age;
      if (duration < 1 && shortest > duration) {
        debug('visual.water.skipped', { radius, duration });
        return;
      }
      this.recycle(this.active.splice(victimIndex, 1)[0]);
    }
    const effect = this.pool.pop() ?? this.createImpact();
    effect.age = 0;
    effect.duration = reduced ? .22 : duration;
    effect.radius = radius;
    effect.surface.position.set(at.x, .09, at.z);
    effect.surface.scaling.setAll(radius * 2);
    effect.surface.rotation.y = 0;
    effect.surface.visibility = reduced ? .6 : 1;
    effect.surface.setEnabled(true);
    effect.rim.position.set(at.x, .15, at.z);
    effect.rim.scaling.setAll(radius * 2);
    effect.rim.visibility = 1;
    effect.rim.setEnabled(true);
    effect.splash.position.set(at.x, 2.4, at.z);
    effect.splash.scaling.setAll(Math.min(4.8, radius * 1.1));
    effect.splash.visibility = 1;
    const prison = !reduced && duration > 1 && this.prisonManager.texture.isReady();
    effect.surface.setEnabled(!prison);
    effect.rim.setEnabled(!prison);
    effect.splash.setEnabled(!reduced && !prison);
    effect.prison.position.set(at.x, radius * .58, at.z);
    effect.prison.width = radius * 2.8;
    effect.prison.height = radius * 2.4;
    effect.prison.cellIndex = 0;
    effect.prison.color.a = .82;
    effect.prison.isVisible = prison;
    this.active.push(effect);
    if (!reduced) {
      (this.droplets.emitter as Vector3).set(at.x, .35, at.z);
      this.droplets.manualEmitCount = Math.min(128, this.droplets.manualEmitCount + 28);
    }
    debug('visual.water.impact', { radius, duration: effect.duration, reduced, prison });
  }

  tick(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const effect = this.active[i];
      effect.age += dt;
      if (effect.age >= effect.duration) {
        this.recycle(effect);
        this.active.splice(i, 1);
        continue;
      }
      const progress = effect.age / effect.duration;
      const fade = progress > .82 ? (1 - progress) / .18 : 1;
      if (effect.surface.isEnabled()) effect.surface.visibility = fade;
      if (effect.rim.isEnabled()) effect.rim.visibility = effect.duration <= .22
        ? fade : fade * (.72 + .14 * Math.sin(effect.age * 10));
      if (effect.prison.isVisible) {
        effect.prison.cellIndex = waterPrisonFrame(effect.age, effect.duration);
        effect.prison.color.a = .82 * fade;
      }
      if (effect.duration > .22) {
        if (effect.surface.isEnabled()) effect.surface.rotation.y += dt * 1.45;
        if (effect.rim.isEnabled()) effect.rim.scaling.setAll(effect.radius * 2 * (1 + .025 * Math.sin(effect.age * 6)));
        if (effect.splash.isEnabled()) {
          effect.splash.visibility = Math.max(0, 1 - effect.age / .72);
          effect.splash.scaling.setAll(Math.min(4.8, effect.radius * 1.1) * (1 + Math.min(effect.age, .72) * .3));
        }
      }
    }
  }

  clear(): void {
    for (const effect of this.active) this.recycle(effect);
    this.active.length = 0;
    this.droplets.reset();
    this.droplets.manualEmitCount = 0;
  }

  private material(name: string, texture: DynamicTexture): StandardMaterial {
    const material = new StandardMaterial(name, this.scene);
    material.diffuseTexture = texture;
    material.emissiveTexture = texture;
    material.emissiveColor = Color3.White();
    material.useAlphaFromDiffuseTexture = true;
    material.disableLighting = true;
    material.disableDepthWrite = true;
    material.backFaceCulling = false;
    material.alphaMode = Engine.ALPHA_COMBINE;
    return material;
  }

  private createImpact(): WaterImpact {
    const surface = MeshBuilder.CreatePlane('water-whirlpool-surface', { size: 1 }, this.scene);
    surface.rotation.x = Math.PI / 2;
    surface.material = this.waterMaterial;
    const rim = MeshBuilder.CreateTorus('water-whirlpool-foam',
      { diameter: 1, thickness: .025, tessellation: 64 }, this.scene);
    rim.material = this.foamMaterial;
    const splash = MeshBuilder.CreatePlane('water-whirlpool-splash', { size: 1 }, this.scene);
    splash.billboardMode = Mesh.BILLBOARDMODE_ALL;
    splash.material = this.splashMaterial;
    const prison = new Sprite('haba-water-prison', this.prisonManager);
    prison.isVisible = false;
    for (const mesh of [surface, rim, splash]) mesh.isPickable = false;
    return { surface, rim, splash, prison, age: 0, duration: 0, radius: 0 };
  }

  private recycle(effect: WaterImpact): void {
    effect.surface.setEnabled(false);
    effect.rim.setEnabled(false);
    effect.splash.setEnabled(false);
    effect.prison.isVisible = false;
    this.pool.push(effect);
  }
}
