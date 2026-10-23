import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { SpriteManager } from '@babylonjs/core/Sprites/spriteManager.js';
import type { Enemy, Unit } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import { VisualFireAccents } from './visual-fire-accents.js';
import { VisualFireProjectiles } from './visual-fire-projectiles.js';

const FIRE_HEROES = new Set(['h003', 'h00B', 'h00C', 'h00V', 'h011', 'h017', 'h01H', 'h01K', 'h041']);
const MAX_FLAMES = 48;
const MAX_BURNING = 24;
const MAX_GROUND_BURNING = 16;
const MAX_BURSTS = 12;
const FLIPBOOK_FRAMES = 16;

export function isFireSkill(skillId?: string): boolean {
  if (!skillId) return false;
  const id = skillId.startsWith('skill-') ? skillId.slice(6)
    : skillId.startsWith('web-') ? skillId.slice(4) : '';
  return FIRE_HEROES.has(id);
}

export function hasFireBurn(enemy: Enemy, units: Record<string, Unit>): boolean {
  if (!enemy.burn || enemy.burn.remaining <= 0) return false;
  const caster = units[enemy.burn.casterId];
  return Boolean(caster && FIRE_HEROES.has(caster.heroId));
}

export function fireFlipbookFrame(age: number, duration: number): number {
  return Math.max(0, Math.min(FLIPBOOK_FRAMES - 1, Math.floor(age / duration * FLIPBOOK_FRAMES)));
}

type Flame = { mesh: Mesh; age: number; duration: number; width: number; rise: number; drift: number; burst: boolean };
type Burning = { mesh: Mesh; age: number; phase: number; touched: boolean };
type Burst = { sprite: Sprite; age: number; duration: number; size: number };

/** Flame silhouettes for fire skills and a live marker for their burn damage. */
export class VisualFire {
  private active: Flame[] = [];
  private burning = new Map<string, Burning>();
  private groundBurning = new Map<string, Burning>();
  private pool: Mesh[] = [];
  private bursts: Burst[] = [];
  private burstPool: Sprite[] = [];
  private burstManager: SpriteManager;
  private accents: VisualFireAccents;
  private projectiles: VisualFireProjectiles;
  private material: StandardMaterial;
  private impactMaterial: StandardMaterial;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)');

  constructor(private scene: Scene) {
    this.accents = new VisualFireAccents(scene);
    this.burstManager = new SpriteManager('fire-flipbook', '/assets/vfx-fire-flipbook.webp',
      MAX_BURSTS, { width: 256, height: 256 }, scene);
    this.burstManager.isPickable = false;
    this.burstManager.texture.hasAlpha = true;
    this.burstManager.texture.onLoadObservable.addOnce(() => debug('visual.fire.flipbook.ready'));
    const texture = new DynamicTexture('fire-silhouette', { width: 64, height: 96 }, scene, false);
    const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 64, 96);
    const outer = ctx.createLinearGradient(0, 96, 0, 7);
    outer.addColorStop(0, '#fa4529'); outer.addColorStop(.45, '#ff7434'); outer.addColorStop(1, '#ffb654');
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.moveTo(7, 94); ctx.bezierCurveTo(1, 72, 22, 59, 20, 42);
    ctx.bezierCurveTo(28, 52, 27, 24, 35, 5);
    ctx.bezierCurveTo(37, 31, 52, 42, 46, 61);
    ctx.bezierCurveTo(57, 51, 61, 79, 55, 94); ctx.closePath(); ctx.fill();
    const inner = ctx.createLinearGradient(0, 95, 0, 34);
    inner.addColorStop(0, '#fff5a9'); inner.addColorStop(.55, '#ffe05c'); inner.addColorStop(1, '#ffac36');
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.moveTo(18, 94); ctx.bezierCurveTo(14, 78, 30, 68, 29, 51);
    ctx.bezierCurveTo(37, 62, 42, 70, 44, 94); ctx.closePath(); ctx.fill();
    texture.hasAlpha = true; texture.update();

    this.material = new StandardMaterial('skill-fire', scene);
    this.material.diffuseTexture = texture;
    this.material.emissiveTexture = texture;
    this.material.emissiveColor = Color3.White();
    this.material.useAlphaFromDiffuseTexture = true;
    this.material.disableLighting = true;
    this.material.backFaceCulling = false;
    this.material.alphaMode = Engine.ALPHA_COMBINE;
    this.material.disableDepthWrite = true;
    this.projectiles = new VisualFireProjectiles(scene, this.material,
      (position, full, radius) => this.impact(position, full, radius));

    const impactTexture = new Texture('/assets/vfx-fire-impact.webp', scene, false, true,
      Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.fire.texture.ready'),
      (_message, error) => debug('visual.fire.texture.error', { message: String(error ?? 'load failed') }));
    this.impactMaterial = new StandardMaterial('skill-fire-impact', scene);
    this.impactMaterial.diffuseTexture = impactTexture;
    this.impactMaterial.emissiveTexture = impactTexture;
    this.impactMaterial.emissiveColor = Color3.White();
    this.impactMaterial.useAlphaFromDiffuseTexture = true;
    this.impactMaterial.disableLighting = true;
    this.impactMaterial.backFaceCulling = false;
    this.impactMaterial.alphaMode = Engine.ALPHA_COMBINE;
    this.impactMaterial.disableDepthWrite = true;
  }

  cast(position: Vector3): void {
    this.spawn(position, 0, 1, .45, .32);
  }

  launch(from: Vector3, to: Vector3, full: boolean, radius = 0): void {
    if (this.reduced.matches || Vector3.DistanceSquared(from, to) <= 1.5) {
      this.impact(to, full, radius);
      return;
    }
    this.projectiles.launch(from, to, full, radius);
  }

  impact(position: Vector3, full: boolean, radius = 0): void {
    const flipbook = !this.reduced.matches && this.burstManager.texture.isReady();
    if (flipbook) this.spawnBurst(position, full);
    else this.spawn(position, 0, full ? 4.2 : 2.2, .46, .18, true);
    if (!this.reduced.matches) this.accents.impact(position, full, radius);
    const count = this.reduced.matches ? 0 : full ? 6 : 2;
    for (let i = 0; i < count; i++) {
      const angle = i * 2.39996;
      const distance = .38 + (i % 3) * .3;
      const at = position.add(new Vector3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance));
      this.spawn(at, angle, full ? 1.05 + (i % 3) * .22 : .7, .5 + (i % 3) * .1, .65);
    }
    debug('visual.fire.impact', { full, flames: count + 1, flipbook, radius });
  }

  markBurning(id: string, position: Vector3, phase: number): void {
    let effect = this.burning.get(id);
    if (!effect) {
      if (this.burning.size >= MAX_BURNING) return;
      effect = { mesh: this.acquire(), age: 0, phase, touched: false };
      this.burning.set(id, effect);
      debug('visual.fire.burn.start', { target: id });
    }
    effect.touched = true;
    effect.mesh.position.copyFrom(position);
  }

  markGroundBurning(id: string, position: Vector3): void {
    let effect = this.groundBurning.get(id);
    if (!effect) {
      if (this.groundBurning.size >= MAX_GROUND_BURNING) return;
      effect = { mesh: this.acquire(), age: 0, phase: 0, touched: false };
      this.groundBurning.set(id, effect);
      debug('visual.fire.ground.start');
    }
    effect.touched = true;
    effect.mesh.position.copyFrom(position);
  }

  tick(dt: number): void {
    this.projectiles.tick(dt);
    this.accents.tick(dt);
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i]; burst.age += dt;
      if (burst.age >= burst.duration) {
        burst.sprite.isVisible = false;
        this.burstPool.push(burst.sprite);
        this.bursts.splice(i, 1);
        continue;
      }
      const progress = burst.age / burst.duration;
      burst.sprite.cellIndex = fireFlipbookFrame(burst.age, burst.duration);
      burst.sprite.width = burst.size * (.7 + .3 * Math.sin(progress * Math.PI));
      burst.sprite.height = burst.sprite.width;
      burst.sprite.color.a = progress > .8 ? (1 - progress) * 5 : 1;
    }
    for (let i = this.active.length - 1; i >= 0; i--) {
      const flame = this.active[i]; flame.age += dt;
      if (flame.age >= flame.duration) {
        this.release(flame.mesh); this.active.splice(i, 1); continue;
      }
      const progress = flame.age / flame.duration;
      flame.mesh.position.y += flame.rise * dt;
      flame.mesh.position.x += flame.drift * dt;
      const width = flame.width * (flame.burst ? .68 + .32 * Math.sin(progress * Math.PI) : 1 - .42 * progress);
      flame.mesh.scaling.set(width, width * (flame.burst ? 1 : 1.6 * (1 + .18 * progress)), 1);
      flame.mesh.visibility = Math.min(1, (1 - progress) * 2);
    }
    for (const [id, effect] of this.burning) {
      if (!effect.touched) {
        this.release(effect.mesh); this.burning.delete(id);
        debug('visual.fire.burn.end', { target: id });
        continue;
      }
      effect.age += dt;
      effect.mesh.position.y += 1.04 + Math.sin(effect.age * 5 + effect.phase) * .09;
      const width = .72 + Math.sin(effect.age * 8 + effect.phase) * .08;
      effect.mesh.scaling.set(width, 1.2 + Math.sin(effect.age * 6 + effect.phase) * .14, 1);
      effect.mesh.visibility = this.reduced.matches ? .8 : 1;
      effect.touched = false;
    }
    for (const [id, effect] of this.groundBurning) {
      if (!effect.touched) {
        this.release(effect.mesh); this.groundBurning.delete(id);
        debug('visual.fire.ground.end');
        continue;
      }
      effect.age += dt;
      effect.mesh.position.y += 1.08;
      effect.mesh.scaling.set(this.reduced.matches ? 1.1 : 1.1 + Math.sin(effect.age * 7) * .08,
        this.reduced.matches ? 1.75 : 1.75 + Math.sin(effect.age * 5) * .14, 1);
      effect.mesh.visibility = this.reduced.matches ? .72 : .9;
      effect.touched = false;
    }
  }

  clear(): void {
    this.projectiles.clear();
    this.accents.clear();
    for (const burst of this.bursts) { burst.sprite.isVisible = false; this.burstPool.push(burst.sprite); }
    this.bursts.length = 0;
    for (const flame of this.active) this.release(flame.mesh);
    this.active.length = 0;
    for (const effect of this.burning.values()) this.release(effect.mesh);
    this.burning.clear();
    for (const effect of this.groundBurning.values()) this.release(effect.mesh);
    this.groundBurning.clear();
  }

  private spawnBurst(position: Vector3, full: boolean): void {
    if (this.bursts.length >= MAX_BURSTS) {
      const oldest = this.bursts.shift()!;
      oldest.sprite.isVisible = false;
      this.burstPool.push(oldest.sprite);
    }
    const sprite = this.burstPool.pop() ?? new Sprite('fire-impact', this.burstManager);
    sprite.position.copyFrom(position);
    sprite.position.y += 1.45;
    sprite.cellIndex = 0;
    sprite.color = new Color4(1, 1, 1, 1);
    sprite.width = full ? 6.4 : 3.2;
    sprite.height = sprite.width;
    sprite.isPickable = false;
    sprite.isVisible = true;
    this.bursts.push({ sprite, age: 0, duration: this.reduced.matches ? .22 : .68,
      size: sprite.width });
  }

  private spawn(position: Vector3, angle: number, width: number, duration: number, rise: number, burst = false): void {
    if (this.active.length >= MAX_FLAMES) this.release(this.active.shift()!.mesh);
    const mesh = this.acquire(burst);
    mesh.position.copyFrom(position); mesh.position.y += burst ? 1.35 : .7;
    mesh.scaling.set(width, width * (burst ? 1 : 1.6), 1);
    this.active.push({ mesh, age: 0, duration: this.reduced.matches ? .22 : duration,
      width, rise, drift: Math.sin(angle) * .22, burst });
  }

  private acquire(burst = false): Mesh {
    const mesh = this.pool.pop() ?? MeshBuilder.CreatePlane('skill-flame', { size: 1 }, this.scene);
    mesh.material = burst ? this.impactMaterial : this.material;
    mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    mesh.isPickable = false;
    mesh.visibility = 1; mesh.setEnabled(true);
    return mesh;
  }

  private release(mesh: Mesh): void {
    mesh.setEnabled(false); this.pool.push(mesh);
  }
}
