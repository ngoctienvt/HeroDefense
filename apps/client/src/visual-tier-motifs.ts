import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { SpriteManager } from '@babylonjs/core/Sprites/spriteManager.js';
import { TIER_MOTIFS, TIER_MOTIF_FRAMES, tierMotifAtlas, tierMotifStill,
  type TierMotif } from './visual-tier-motif-textures.js';
import { debug } from './debug.js';

type MotifEffect = { sprite: Sprite; kind: TierMotif; age: number; duration: number;
  size: number; ground: boolean; spin: number; from?: Vector3; to?: Vector3;
  arcHeight?: number; arrive?: () => void };
const MAX_MOTIFS = 32;
const STATUS_KINDS = ['bell', 'vines', 'shield', 'flower', 'ice'] as const;

/** Server-timed Blender flipbooks, capped and reused across battle effects. */
export class VisualTierMotifs {
  private active: MotifEffect[] = [];
  private pool = new Map<TierMotif, Sprite[]>();
  private managers = new Map<TierMotif, SpriteManager>();
  private materials = new Map<TierMotif, StandardMaterial>();
  private arrivals: (() => void)[] = [];

  constructor(scene: Scene) {
    for (const kind of TIER_MOTIFS) {
      const manager = new SpriteManager(`tier-${kind}`, tierMotifAtlas(kind),
        MAX_MOTIFS, { width: 256, height: 256 }, scene);
      manager.isPickable = false;
      manager.texture.hasAlpha = true;
      manager.texture.onLoadObservable.addOnce(() => debug('visual.tier.motif.ready', { kind }));
      this.managers.set(kind, manager);
      this.pool.set(kind, []);
    }
    for (const kind of STATUS_KINDS) {
      const texture = new Texture(tierMotifStill(kind), scene);
      texture.hasAlpha = true;
      const material = new StandardMaterial(`tier-${kind}-status`, scene);
      material.diffuseTexture = texture;
      material.emissiveTexture = texture;
      material.emissiveColor = Color3.White();
      material.useAlphaFromDiffuseTexture = true;
      material.disableLighting = true;
      material.disableDepthWrite = true;
      material.backFaceCulling = false;
      material.alphaMode = Engine.ALPHA_COMBINE;
      material.zOffset = -2;
      this.materials.set(kind, material);
    }
  }

  materialFor(kind: TierMotif): StandardMaterial {
    const material = this.materials.get(kind);
    if (!material) throw new Error(`Missing tier VFX status motif: ${kind}`);
    return material;
  }

  show(at: Vector3, kind: TierMotif, size: number, duration: number, ground = false, spin = 0,
    reduced = false): void {
    this.spawn(at, kind, size, duration, ground, spin, reduced);
  }

  travel(from: Vector3, to: Vector3, kind: TierMotif, size: number, duration: number,
    arrive: () => void, arcHeight = 0, reduced = false): void {
    if (reduced) {
      this.show(to, kind, size, .18, false, 0, true);
      arrive();
      debug('visual.tier.motif.travel', { kind, duration: 0, reduced });
      return;
    }
    const effect = this.spawn(from, kind, size, duration, false, 0, false);
    effect.from = effect.sprite.position.clone();
    effect.to = to.add(new Vector3(0, to.y > 1.5 ? 0 : 1.75, 0));
    effect.arcHeight = arcHeight;
    effect.arrive = arrive;
    debug('visual.tier.motif.travel', { kind, duration: effect.duration, reduced });
  }

  private spawn(at: Vector3, kind: TierMotif, size: number, duration: number, ground: boolean,
    spin: number, reduced: boolean): MotifEffect {
    let evictedArrival: (() => void) | undefined;
    if (this.active.length >= MAX_MOTIFS) {
      const oldest = this.active.shift()!;
      this.release(oldest);
      evictedArrival = oldest.arrive;
    }
    const sprite = this.pool.get(kind)!.pop() ?? new Sprite(`tier-${kind}`, this.managers.get(kind)!);
    sprite.isPickable = false;
    sprite.isVisible = true;
    sprite.cellIndex = 0;
    sprite.angle = 0;
    sprite.position = new Vector3(at.x, ground ? Math.max(.8, size * .32) : at.y + (at.y > 1.5 ? 0 : 1.75), at.z);
    sprite.width = size * (reduced ? .8 : 1);
    sprite.height = sprite.width;
    sprite.color = new Color4(1, 1, 1, 1);
    const effect: MotifEffect = { sprite, kind, age: 0,
      duration: Math.max(.05, reduced ? Math.min(.25, duration) : duration),
      size, ground, spin: reduced ? 0 : spin };
    this.active.push(effect);
    debug('visual.tier.motif', { kind, ground, reduced });
    evictedArrival?.();
    return effect;
  }

  tick(dt: number): void {
    this.arrivals.length = 0;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const effect = this.active[i];
      effect.age += dt;
      if (effect.age >= effect.duration) {
        this.release(effect); this.active.splice(i, 1);
        if (effect.arrive) this.arrivals.push(effect.arrive);
        continue;
      }
      const progress = effect.age / effect.duration;
      const sprite = effect.sprite;
      sprite.cellIndex = Math.min(TIER_MOTIF_FRAMES - 1, Math.floor(progress * TIER_MOTIF_FRAMES));
      if (effect.from && effect.to) {
        Vector3.LerpToRef(effect.from, effect.to, progress, sprite.position);
        if (effect.arcHeight) sprite.position.y += Math.sin(progress * Math.PI) * effect.arcHeight;
      } else if (!effect.ground && effect.duration < 1.2) {
        sprite.position.y += dt * .22;
      }
      sprite.width = effect.size * (.82 + .18 * Math.min(1, progress * 5));
      sprite.height = sprite.width;
      sprite.color.a = progress < .72 ? 1 : (1 - progress) / .28;
      if (effect.spin) sprite.angle += effect.spin * dt;
    }
    for (const arrive of this.arrivals) arrive();
  }

  clear(): void {
    for (const effect of this.active) this.release(effect);
    this.active.length = 0;
    this.arrivals.length = 0;
  }

  private release(effect: MotifEffect): void {
    effect.sprite.isVisible = false;
    this.pool.get(effect.kind)!.push(effect.sprite);
  }
}
