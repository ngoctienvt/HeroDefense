import { Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import type { Particle } from '@babylonjs/core/Particles/particle.js';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';

type Drop = { position: Vector3; direction: Vector3 };
type Rgba = readonly [number, number, number, number];

/** Look of one spray system. Gravity is Y acceleration (negative = falls). */
export interface SprayPreset {
  texture: string;
  capacity: number;
  maxQueued: number;
  life: readonly [min: number, max: number];
  size: readonly [min: number, max: number];
  gravity: number;
  color1: Rgba;
  color2: Rgba;
  colorDead: Rgba;
}

export const SPRAY_PRESETS = {
  /** Cộng Công's black-water droplets; values are the original constructor numbers. */
  blackwater: {
    texture: '/assets/vfx-circle_03.webp', capacity: 520, maxQueued: 260,
    life: [.45, .85], size: [.16, .42], gravity: -11,
    color1: [.72, .85, .86, .95], color2: [.18, .55, .6, .9], colorDead: [.06, .24, .32, 0],
  },
  /** Chúc Dung's embers and lava spatter: hot yellow-orange sparks that cool to dark red. */
  lava: {
    texture: '/assets/vfx-circle_03.webp', capacity: 420, maxQueued: 220,
    life: [.5, 1], size: [.14, .36], gravity: -9,
    color1: [1, .8, .35, 1], color2: [1, .38, .1, .95], colorDead: [.25, .05, .02, 0],
  },
} as const satisfies Record<string, SprayPreset>;

export type SprayPresetName = keyof typeof SPRAY_PRESETS;

const color = ([r, g, b, a]: Rgba): Color4 => new Color4(r, g, b, a);

/**
 * Droplets/fragments for one hero's layers. One pooled ParticleSystem; callers queue
 * emission points (ring, burst, arc) and each new particle consumes one queued drop.
 */
export class KitSpray {
  private system: ParticleSystem;
  private queue: Drop[] = [];
  private assigned = new Map<Particle, Drop>();

  private maxQueued: number;

  constructor(scene: Scene, presetName: SprayPresetName) {
    const preset: SprayPreset = SPRAY_PRESETS[presetName];
    this.maxQueued = preset.maxQueued;
    const system = new ParticleSystem(`kit-spray-${presetName}`, preset.capacity, scene);
    system.particleTexture = new Texture(preset.texture, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      undefined, (_message, error) => debug('visual.kit.asset.error', { asset: `spray-${presetName}`, message: String(error ?? 'load failed') }));
    system.emitter = Vector3.Zero();
    system.emitRate = 0;
    system.manualEmitCount = 0;
    [system.minLifeTime, system.maxLifeTime] = preset.life;
    [system.minSize, system.maxSize] = preset.size;
    system.minEmitPower = 1; system.maxEmitPower = 1;
    system.gravity = new Vector3(0, preset.gravity, 0);
    system.color1 = color(preset.color1);
    system.color2 = color(preset.color2);
    system.colorDead = color(preset.colorDead);
    system.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    system.isLocal = false;
    // Position and direction hooks both read the same queued drop; particles are recycled,
    // so the pairing is dropped once the second hook has consumed it.
    const take = (particle: Particle): Drop => {
      const pending = this.assigned.get(particle);
      if (pending) { this.assigned.delete(particle); return pending; }
      const drop = this.queue.shift() ?? { position: Vector3.Zero(), direction: Vector3.Up() };
      this.assigned.set(particle, drop);
      return drop;
    };
    system.startPositionFunction = (_world, position, particle) => position.copyFrom(take(particle).position);
    system.startDirectionFunction = (_world, direction, particle) => direction.copyFrom(take(particle).direction);
    system.start();
    this.system = system;
  }

  /** Droplets thrown outward and up from a ring (wave crest, pool edge, shell burst). */
  ring(center: Vector3, radius: number, count: number, height: number, outward: number, up: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      this.push(new Vector3(center.x + c * radius, center.y + height * (.4 + .6 * Math.random()), center.z + s * radius),
        new Vector3(c * outward * (.6 + .6 * Math.random()), up * (.6 + .6 * Math.random()), s * outward * (.6 + .6 * Math.random())));
    }
  }

  /** Droplets sucked upward toward a point (windup tension). */
  rise(center: Vector3, radius: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, r = radius * (.6 + .4 * Math.random());
      this.push(new Vector3(center.x + Math.cos(a) * r, .1, center.z + Math.sin(a) * r),
        new Vector3(-Math.cos(a) * 1.2, 6 + Math.random() * 3, -Math.sin(a) * 1.2));
    }
  }

  /** A short trail at one point with a given velocity. */
  trail(at: Vector3, velocity: Vector3, count: number): void {
    for (let i = 0; i < count; i++) {
      this.push(at.clone(), velocity.add(new Vector3(Math.random() - .5, Math.random(), Math.random() - .5)));
    }
  }

  clear(): void {
    this.queue.length = 0;
    this.assigned.clear();
    this.system.manualEmitCount = 0;
    this.system.reset();
  }

  dispose(): void { this.system.dispose(); }

  private push(position: Vector3, direction: Vector3): void {
    if (this.queue.length >= this.maxQueued) return;
    this.queue.push({ position, direction });
    this.system.manualEmitCount = Math.max(0, this.system.manualEmitCount) + 1;
  }
}
