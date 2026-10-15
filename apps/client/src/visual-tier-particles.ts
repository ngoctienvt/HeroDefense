import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem.js';
import { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';

/** Reused textured particles for Huyền impacts; silhouettes stay in the skill painter. */
export class VisualTierParticles {
  private bursts: ParticleSystem[] = [];
  private smokes: ParticleSystem[] = [];
  private nextBurst = 0;
  private nextSmoke = 0;

  constructor(scene: Scene) {
    const spark = new Texture('/assets/vfx-spark_01.webp', scene, false, true,
      Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.tier.particle.ready', { kind: 'spark' }),
      (_message, error) => debug('visual.tier.particle.error', { kind: 'spark', message: String(error ?? 'load failed') }));
    const smoke = new Texture('/assets/vfx-smoke_03.webp', scene, false, true,
      Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.tier.particle.ready', { kind: 'smoke' }),
      (_message, error) => debug('visual.tier.particle.error', { kind: 'smoke', message: String(error ?? 'load failed') }));
    spark.hasAlpha = smoke.hasAlpha = true;

    for (let i = 0; i < 4; i++) {
      const system = new ParticleSystem(`tier-impact-${i}`, 64, scene);
      system.particleTexture = spark;
      system.emitter = Vector3.Zero();
      system.createPointEmitter(new Vector3(-1, .5, -1), new Vector3(1, 2.2, 1));
      system.emitRate = 0; system.manualEmitCount = 0;
      system.minLifeTime = .24; system.maxLifeTime = .52;
      system.minSize = .11; system.maxSize = .3;
      system.minEmitPower = 1; system.maxEmitPower = 3;
      system.gravity = new Vector3(0, -3.5, 0);
      system.colorDead = new Color4(0, 0, 0, 0);
      system.blendMode = ParticleSystem.BLENDMODE_ADD;
      system.start(); this.bursts.push(system);
    }
    for (let i = 0; i < 3; i++) {
      const system = new ParticleSystem(`tier-smoke-${i}`, 32, scene);
      system.particleTexture = smoke;
      system.emitter = Vector3.Zero();
      system.createPointEmitter(new Vector3(-.4, .3, -.4), new Vector3(.4, 1.1, .4));
      system.emitRate = 0; system.manualEmitCount = 0;
      system.minLifeTime = .45; system.maxLifeTime = .85;
      system.minSize = .55; system.maxSize = 1.15;
      system.minEmitPower = .5; system.maxEmitPower = 1.2;
      system.gravity = new Vector3(0, .4, 0);
      system.colorDead = new Color4(0, 0, 0, 0);
      system.blendMode = ParticleSystem.BLENDMODE_STANDARD;
      system.start(); this.smokes.push(system);
    }
  }

  burst(at: Vector3, color: string, count: number, spread: number): void {
    const system = this.bursts[this.nextBurst++ % this.bursts.length];
    (system.emitter as Vector3).copyFrom(at);
    (system.emitter as Vector3).y += 1.1;
    const tint = Color3.FromHexString(color);
    system.color1 = new Color4(tint.r, tint.g, tint.b, 1);
    system.color2 = new Color4(Math.min(1, tint.r * 1.2), Math.min(1, tint.g * 1.2), Math.min(1, tint.b * 1.2), .8);
    system.minEmitPower = Math.max(.6, spread * .45);
    system.maxEmitPower = Math.max(1, spread);
    system.manualEmitCount = Math.min(64, system.manualEmitCount + Math.min(24, count));
  }

  smoke(at: Vector3, color: string, size = 3.2, duration = .65): void {
    const system = this.smokes[this.nextSmoke++ % this.smokes.length];
    (system.emitter as Vector3).copyFrom(at);
    (system.emitter as Vector3).y += .6;
    const tint = Color3.FromHexString(color);
    system.color1 = new Color4(tint.r, tint.g, tint.b, .32);
    system.color2 = new Color4(tint.r, tint.g, tint.b, .18);
    system.minSize = size * .16;
    system.maxSize = size * .3;
    system.minLifeTime = duration * .7;
    system.maxLifeTime = duration;
    system.manualEmitCount = Math.min(32, system.manualEmitCount + 7);
  }

  clear(): void {
    for (const system of [...this.bursts, ...this.smokes]) {
      system.reset(); system.manualEmitCount = 0;
    }
  }
}
