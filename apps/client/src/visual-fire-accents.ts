import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem.js';
import { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';

const EMITTERS = 4;
const MAX_FLASHES = 2;
const MAX_OVERLAYS = 24;

type Flash = { light: PointLight; age: number; duration: number };
type OverlayKind = 'flash' | 'smoke' | 'ring';
type Overlay = { mesh: Mesh; kind: OverlayKind; age: number; delay: number; duration: number; size: number };

/** Small pooled accents layered over the authored fire flipbook. */
export class VisualFireAccents {
  private emitters: ParticleSystem[] = [];
  private flashes: Flash[] = [];
  private overlays: Overlay[] = [];
  private overlayPool: Mesh[] = [];
  private overlayMaterials: Record<OverlayKind, StandardMaterial>;
  private nextEmitter = 0;
  private nextFlash = 0;

  constructor(private scene: Scene) {
    this.overlayMaterials = {
      flash: this.makeOverlayMaterial(scene, 'flash', '/assets/vfx-fire-flash.webp',
        new Color3(1, .72, .35), Engine.ALPHA_ADD),
      smoke: this.makeOverlayMaterial(scene, 'smoke', '/assets/vfx-fire-smoke.webp',
        new Color3(.32, .18, .12), Engine.ALPHA_COMBINE),
      ring: this.makeOverlayMaterial(scene, 'ring', '/assets/vfx-fire-shockwave.webp',
        new Color3(1, .38, .1), Engine.ALPHA_ADD),
    };
    const texture = new DynamicTexture('fire-ember-gradient', { width: 32, height: 32 }, scene, false);
    const ctx = texture.getContext();
    const gradient = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(.3, 'rgba(255,238,158,.9)');
    gradient.addColorStop(1, 'rgba(255,85,26,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 32, 32);
    texture.hasAlpha = true; texture.update();

    for (let i = 0; i < EMITTERS; i++) {
      const particles = new ParticleSystem(`fire-embers-${i}`, 64, scene);
      particles.particleTexture = texture;
      particles.emitter = new Vector3(0, 0, 0);
      particles.createPointEmitter(new Vector3(-1.8, .8, -1.8), new Vector3(1.8, 3.2, 1.8));
      particles.emitRate = 0;
      particles.manualEmitCount = 0;
      particles.minLifeTime = .3; particles.maxLifeTime = .7;
      particles.minSize = .11; particles.maxSize = .27;
      particles.minEmitPower = 1.4; particles.maxEmitPower = 3.6;
      particles.gravity = new Vector3(0, -2.5, 0);
      particles.color1 = new Color4(1, .76, .27, 1);
      particles.color2 = new Color4(1, .32, .08, 1);
      particles.colorDead = new Color4(.4, .08, .03, 0);
      particles.blendMode = ParticleSystem.BLENDMODE_ADD;
      particles.start();
      this.emitters.push(particles);
    }

    for (let i = 0; i < MAX_FLASHES; i++) {
      const light = new PointLight(`fire-flash-${i}`, Vector3.Zero(), scene);
      light.diffuse.set(1, .42, .12);
      light.range = 7;
      light.intensity = 0;
      light.setEnabled(false);
      this.flashes.push({ light, age: 0, duration: .22 });
    }
  }

  impact(position: Vector3, full: boolean, radius = 0): void {
    const particles = this.emitters[this.nextEmitter++ % this.emitters.length];
    (particles.emitter as Vector3).copyFrom(position);
    (particles.emitter as Vector3).y += .8;
    particles.manualEmitCount = Math.min(64, particles.manualEmitCount + (full ? 22 : 8));
    this.spawnOverlay('flash', position, full ? 3.4 : 1.9, .13);
    if (!full) return;
    if (radius > 0) this.spawnOverlay('ring', position, Math.max(3.8, Math.min(8.2, radius * 2)), .38);
    this.spawnOverlay('smoke', position, 3.5, .68, .14);
    const flash = this.flashes[this.nextFlash++ % this.flashes.length];
    flash.light.position.copyFrom(position);
    flash.light.position.y += 1.6;
    flash.light.intensity = 1.8;
    flash.light.setEnabled(true);
    flash.age = 0;
    debug('visual.fire.accents', { radius, overlays: this.overlays.length });
  }

  tick(dt: number): void {
    for (let i = this.overlays.length - 1; i >= 0; i--) {
      const overlay = this.overlays[i];
      overlay.age += dt;
      if (overlay.age < overlay.delay) continue;
      const progress = (overlay.age - overlay.delay) / overlay.duration;
      if (progress >= 1) { this.releaseOverlay(overlay); this.overlays.splice(i, 1); continue; }
      const mesh = overlay.mesh;
      if (!mesh.isEnabled()) mesh.setEnabled(true);
      const size = overlay.size * (overlay.kind === 'ring' ? .3 + .7 * progress
        : overlay.kind === 'smoke' ? .65 + .55 * progress : .75 + .35 * progress);
      mesh.scaling.set(size, size, 1);
      mesh.visibility = (overlay.kind === 'smoke' ? .38 : overlay.kind === 'ring' ? .7 : .9)
        * (1 - progress) ** (overlay.kind === 'flash' ? 2 : 1);
      if (overlay.kind === 'smoke') mesh.position.y += dt * .65;
    }
    for (const flash of this.flashes) {
      if (!flash.light.isEnabled()) continue;
      flash.age += dt;
      if (flash.age >= flash.duration) {
        flash.light.intensity = 0;
        flash.light.setEnabled(false);
      } else flash.light.intensity = 1.8 * (1 - flash.age / flash.duration) ** 2;
    }
  }

  clear(): void {
    for (const overlay of this.overlays) this.releaseOverlay(overlay);
    this.overlays.length = 0;
    for (const particles of this.emitters) { particles.reset(); particles.manualEmitCount = 0; }
    for (const flash of this.flashes) { flash.light.intensity = 0; flash.light.setEnabled(false); }
  }

  private makeOverlayMaterial(scene: Scene, kind: OverlayKind, url: string,
    color: Color3, alphaMode: number): StandardMaterial {
    const texture = new Texture(url, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.fire.asset.ready', { kind }),
      (_message, error) => debug('visual.fire.asset.error', { kind, message: String(error ?? 'load failed') }));
    texture.hasAlpha = true;
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    const material = new StandardMaterial(`fire-${kind}-overlay`, scene);
    material.diffuseTexture = texture;
    if (kind !== 'smoke') material.emissiveTexture = texture;
    material.diffuseColor = color;
    material.emissiveColor = color;
    material.useAlphaFromDiffuseTexture = true;
    material.disableLighting = true;
    material.backFaceCulling = false;
    material.alphaMode = alphaMode;
    material.disableDepthWrite = true;
    return material;
  }

  private spawnOverlay(kind: OverlayKind, position: Vector3, size: number,
    duration: number, delay = 0): void {
    if (this.overlays.length >= MAX_OVERLAYS) this.releaseOverlay(this.overlays.shift()!);
    const mesh = this.overlayPool.pop() ?? MeshBuilder.CreatePlane('fire-overlay', { size: 1 }, this.scene);
    mesh.material = this.overlayMaterials[kind];
    mesh.billboardMode = kind === 'ring' ? Mesh.BILLBOARDMODE_NONE : Mesh.BILLBOARDMODE_ALL;
    mesh.rotationQuaternion = null;
    mesh.rotation.set(kind === 'ring' ? Math.PI / 2 : 0, 0, 0);
    mesh.position.copyFrom(position);
    mesh.position.y += kind === 'ring' ? .12 : kind === 'smoke' ? 1.1 : 1.45;
    mesh.isPickable = false;
    mesh.scaling.setAll(size);
    mesh.visibility = 1;
    mesh.setEnabled(delay === 0);
    this.overlays.push({ mesh, kind, age: 0, delay, duration, size });
  }

  private releaseOverlay(overlay: Overlay): void {
    overlay.mesh.setEnabled(false);
    this.overlayPool.push(overlay.mesh);
  }
}
