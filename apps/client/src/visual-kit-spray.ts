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
  /** Triệu Công Minh: actual detached square-hole gold coin from the strike sheet. */
  fortune: {
    texture: '/assets/vfx-trieu-cong-minh-chip.webp', capacity: 180, maxQueued: 110,
    life: [.25, .55], size: [.12, .26], gravity: -10,
    color1: [1, 1, 1, .95], color2: [.95, .85, .65, .9], colorDead: [.16, .07, .035, 0],
  },
  /** Khổng Tước: detached existing eye feathers, standard alpha and gravity, never white additive fog. */
  peacock: {
    texture: '/assets/vfx-khong-tuoc-chip.webp', capacity: 180, maxQueued: 110,
    life: [.3, .6], size: [.2, .42], gravity: -5,
    color1: [1, 1, 1, .95], color2: [.8, .95, .9, .9], colorDead: [.12, .08, .2, 0],
  },
  /** Trầm Hương: detached dark stone from the golden axe impact, with gravity. */
  tramhuong: {
    texture: '/assets/vfx-tram-huong-chip.webp', capacity: 220, maxQueued: 130,
    life: [.25, .6], size: [.1, .25], gravity: -13,
    color1: [1, 1, 1, .95], color2: [.8, .8, .66, .9], colorDead: [.12, .16, .1, 0],
  },
  /** Ngưu Ma Vương: actual detached iron-earth chip sampled from the hero's quake art. */
  nguumavuong: {
    texture: '/assets/vfx-nguu-ma-vuong-chip.webp', capacity: 220, maxQueued: 130,
    life: [.3, .65], size: [.1, .24], gravity: -13,
    color1: [1, 1, 1, .95], color2: [.85, .73, .6, .9], colorDead: [.15, .095, .06, 0],
  },
  /** Phán Quan: heavy black-violet ink drops with occasional dark-gold flecks. */
  phanquan: {
    texture: '/assets/vfx-circle_03.webp', capacity: 220, maxQueued: 130,
    life: [.3, .65], size: [.07, .2], gravity: -8,
    color1: [.17, .09, .22, .95], color2: [.78, .58, .22, .9], colorDead: [.04, .025, .055, 0],
  },
  /** Chung Quỳ: cinnabar sparks and violet ash, with gravity and a dark spent edge. */
  chungquy: {
    texture: '/assets/vfx-circle_03.webp', capacity: 220, maxQueued: 130,
    life: [.25, .65], size: [.07, .2], gravity: -7,
    color1: [1, .4, .16, .95], color2: [.62, .18, .66, .9], colorDead: [.1, .025, .08, 0],
  },
  /** Tinh Vệ: real detached amber chip from the impact art, falling as heavy stone. */
  tinhve: {
    texture: '/assets/vfx-tinh-ve-stone.webp', capacity: 220, maxQueued: 130,
    life: [.25, .45], size: [.16, .3], gravity: -12,
    color1: [1, 1, 1, .95], color2: [.85, .72, .55, .9], colorDead: [.23, .15, .09, 0],
  },
  /** Tiểu Bạch Long: real detached leaf extracted from the existing final gust frame. */
  tieubachlong: {
    texture: '/assets/vfx-tieu-bach-long-leaf.webp', capacity: 220, maxQueued: 130,
    life: [.35, .8], size: [.15, .36], gravity: -3,
    color1: [.9, 1, .95, .95], color2: [.5, .86, .65, .9], colorDead: [.12, .28, .19, 0],
  },
  /** Sa Ngộ Tịnh: granular ochre sand, heavy warm grains with restrained gold flecks. */
  sangotinh: {
    texture: '/assets/vfx-circle_03.webp', capacity: 200, maxQueued: 120,
    life: [.3, .65], size: [.045, .13], gravity: -6,
    color1: [.92, .72, .36, .95], color2: [.52, .33, .14, .9], colorDead: [.19, .12, .08, 0],
  },
  /** Long Vương: blue seawater with white foam, separate from Cộng Công's dark water. */
  longvuong: {
    texture: '/assets/vfx-circle_03.webp', capacity: 420, maxQueued: 220,
    life: [.4, .8], size: [.12, .33], gravity: -10,
    color1: [.82, .95, 1, .95], color2: [.12, .52, .85, .9], colorDead: [.025, .14, .3, 0],
  },
  /** Heavy blood-sea droplets, with a dark body and restrained wet rim. */
  blood: {
    texture: '/assets/vfx-circle_03.webp', capacity: 260, maxQueued: 140,
    life: [.4, .75], size: [.13, .32], gravity: -10,
    color1: [.7, .1, .2, .95], color2: [.35, .015, .055, .95], colorDead: [.1, .005, .02, 0],
  },
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
  /** Kim: bright gold sparks that cool to bronze. */
  gold: {
    texture: '/assets/vfx-circle_03.webp', capacity: 260, maxQueued: 140,
    life: [.35, .7], size: [.1, .26], gravity: -8,
    color1: [1, .92, .55, 1], color2: [.9, .6, .15, .95], colorDead: [.35, .2, .04, 0],
  },
  /** Mộc: leaf and spore flecks drifting down. */
  jade: {
    texture: '/assets/vfx-circle_03.webp', capacity: 260, maxQueued: 140,
    life: [.5, 1], size: [.12, .3], gravity: -3,
    color1: [.75, 1, .55, 1], color2: [.2, .65, .3, .95], colorDead: [.05, .25, .12, 0],
  },
  /** Mộc độc: yellow-green poison spores that drift upward and sour to olive. */
  toxin: {
    texture: '/assets/vfx-circle_03.webp', capacity: 160, maxQueued: 80,
    life: [.6, 1], size: [.1, .24], gravity: 1.2,
    color1: [.85, 1, .35, 1], color2: [.45, .78, .15, .9], colorDead: [.2, .3, .05, 0],
  },
  /** Mộc xuân (Mẫu Đơn): peony petal flecks, coral-pink drifting up and fading to deep rose. */
  petal: {
    texture: '/assets/vfx-circle_03.webp', capacity: 200, maxQueued: 100,
    life: [.6, 1.1], size: [.12, .3], gravity: 1,
    color1: [1, .86, .78, 1], color2: [.93, .43, .47, .95], colorDead: [.45, .12, .22, 0],
  },
  /** Nhiếp Tiểu Thiến: pale orchid petals and sound motes, white-lilac drifting up and cooling to blue-violet. */
  orchid: {
    texture: '/assets/vfx-circle_03.webp', capacity: 160, maxQueued: 80,
    life: [.6, 1.1], size: [.1, .26], gravity: 1.2,
    color1: [.95, .93, 1, 1], color2: [.66, .56, .96, .95], colorDead: [.22, .3, .66, 0],
  },
  /** Thổ: heavy rock chips and dust. */
  earth: {
    texture: '/assets/vfx-circle_03.webp', capacity: 300, maxQueued: 160,
    life: [.45, .85], size: [.14, .36], gravity: -14,
    color1: [.9, .75, .5, 1], color2: [.5, .34, .17, .95], colorDead: [.2, .13, .06, 0],
  },
  /** Hỏa u minh: violet embers. */
  nether: {
    texture: '/assets/vfx-circle_03.webp', capacity: 260, maxQueued: 140,
    life: [.5, .95], size: [.12, .32], gravity: -5,
    color1: [.95, .65, 1, 1], color2: [.55, .2, .85, .95], colorDead: [.12, .03, .25, 0],
  },
  /** Hỗn Độn (Nguyên Thủy): pale jade-grey space shards and ink flecks that fall slowly. */
  chaos: {
    texture: '/assets/vfx-circle_03.webp', capacity: 260, maxQueued: 140,
    life: [.45, .9], size: [.12, .34], gravity: -6,
    color1: [.93, .92, .8, 1], color2: [.38, .5, .56, .95], colorDead: [.06, .1, .15, 0],
  },
  /** Thủy hàn: ice flecks. */
  frost: {
    texture: '/assets/vfx-circle_03.webp', capacity: 260, maxQueued: 140,
    life: [.4, .8], size: [.1, .26], gravity: -7,
    color1: [.9, 1, 1, 1], color2: [.45, .8, .95, .95], colorDead: [.1, .3, .45, 0],
  },
  /** Mạnh Bà (Vong Xuyên): teal water bubbles and lilac soul wisps drifting up and cooling to deep teal. */
  vongxuyen: {
    texture: '/assets/vfx-circle_03.webp', capacity: 180, maxQueued: 90,
    life: [.5, 1], size: [.1, .26], gravity: .6,
    color1: [.8, 1, .96, 1], color2: [.42, .86, .84, .9], colorDead: [.14, .36, .42, 0],
  },
  /** Phục Hy (Bát Quái): teal jade shards and gold flecks drawn toward the centre, falling slowly. */
  bagua: {
    texture: '/assets/vfx-circle_03.webp', capacity: 320, maxQueued: 160,
    life: [.5, 1], size: [.14, .34], gravity: -2.5,
    color1: [.8, 1, .92, 1], color2: [.2, .78, .66, .95], colorDead: [.04, .22, .2, 0],
  },
  /** Chúc Long (Liệt Nhật): crimson-gold sparks that jump up fast and cool to dark red (not Chúc Dung's lava). */
  daybreak: {
    texture: '/assets/vfx-circle_03.webp', capacity: 300, maxQueued: 150,
    life: [.35, .8], size: [.12, .34], gravity: 3.5,
    color1: [1, .8, .38, 1], color2: [.9, .26, .12, .95], colorDead: [.25, .04, .04, 0],
  },
  /** Hình Thiên (Ma Hỏa): scarlet embers and plum ash that scatter and sink slowly (never gold: that is Hậu Nghệ's sun). */
  warfire: {
    texture: '/assets/vfx-circle_03.webp', capacity: 360, maxQueued: 200,
    life: [.4, .95], size: [.1, .3], gravity: -3.5,
    color1: [.97, .42, .3, 1], color2: [.5, .1, .24, .95], colorDead: [.12, .03, .09, 0],
  },
  /** Đế Tuấn (Kim Ô): pale-gold feather embers that float down slowly and cool to copper-brown. */
  solar: {
    texture: '/assets/vfx-circle_03.webp', capacity: 360, maxQueued: 180,
    life: [.6, 1.1], size: [.18, .42], gravity: -4.5,
    color1: [1, .88, .63, 1], color2: [.87, .5, .18, .95], colorDead: [.28, .1, .08, 0],
  },
  /** Phượng Hoàng: gold-white sparks cooling through crimson (heavier and redder than the Chúc Dung lava spatter). */
  phoenix: {
    texture: '/assets/vfx-circle_03.webp', capacity: 520, maxQueued: 260,
    life: [.7, 1.3], size: [.2, .5], gravity: -3.5,
    color1: [1, .86, .42, 1], color2: [.92, .2, .08, .95], colorDead: [.3, .03, .04, 0],
  },
  /** Thần Nông (dược thảo): pale sage motes and leaf flecks that fall slowly, greying to bronze-olive. */
  herbal: {
    texture: '/assets/vfx-circle_03.webp', capacity: 300, maxQueued: 150,
    life: [.7, 1.3], size: [.14, .36], gravity: -2.2,
    color1: [.78, .85, .6, 1], color2: [.4, .6, .34, .95], colorDead: [.16, .2, .08, 0],
  },
  /** Hằng Nga (Nguyệt Hoa): silver-white moon motes that float up and cool to lilac then deep indigo. */
  moon: {
    texture: '/assets/vfx-circle_03.webp', capacity: 320, maxQueued: 160,
    life: [.6, 1.2], size: [.12, .32], gravity: .9,
    color1: [.94, .98, 1, 1], color2: [.62, .66, .92, .95], colorDead: [.14, .16, .38, 0],
  },
  /** Tây Vương Mẫu (Côn Lôn): gold hairpin dust with jade flecks, settling fast. */
  kunlun: {
    texture: '/assets/vfx-circle_03.webp', capacity: 320, maxQueued: 160,
    life: [.45, .9], size: [.12, .3], gravity: -7,
    color1: [1, .9, .55, 1], color2: [.45, .8, .6, .95], colorDead: [.3, .22, .06, 0],
  },
  /** Lục Nhĩ (Hỗn Thế Ma Côn): dark-gold shards and violet-ink flecks thrown off the cudgel, falling fast and cooling to near-black. */
  lucnhi: {
    texture: '/assets/vfx-circle_03.webp', capacity: 360, maxQueued: 180,
    life: [.3, .65], size: [.1, .26], gravity: -8,
    color1: [.95, .8, .45, 1], color2: [.4, .22, .5, .95], colorDead: [.07, .04, .12, 0],
  },
  /** Kim Sí Đại Bằng: pale-gold metal flecks and feather chips that fall fast, cooling to bronze-brown. */
  goldwing: {
    texture: '/assets/vfx-circle_03.webp', capacity: 300, maxQueued: 150,
    life: [.4, .85], size: [.12, .3], gravity: -6,
    color1: [1, .93, .65, 1], color2: [.8, .6, .22, .95], colorDead: [.25, .17, .08, 0],
  },
  /** Kim Sí Đại Bằng bleed: small dark-red droplets that fall and vanish. */
  goldwingblood: {
    texture: '/assets/vfx-circle_03.webp', capacity: 120, maxQueued: 60,
    life: [.35, .7], size: [.08, .18], gravity: -9,
    color1: [.78, .1, .1, 1], color2: [.45, .03, .05, .95], colorDead: [.2, .02, .03, 0],
  },
  /** Thái Bạch (Trường Canh): pale-gold starlight motes with silver flecks that drift up and cool to slate blue. */
  changgeng: {
    texture: '/assets/vfx-circle_03.webp', capacity: 260, maxQueued: 130,
    life: [.5, 1], size: [.12, .3], gravity: 1.2,
    color1: [1, .95, .77, 1], color2: [.85, .87, .93, .95], colorDead: [.16, .17, .31, 0],
  },
  /** Nhiên Đăng (Định Hải Thần Châu): ivory-amber lamp motes that drift up slowly and cool to plum. */
  lantern: {
    texture: '/assets/vfx-circle_03.webp', capacity: 360, maxQueued: 180,
    life: [.7, 1.3], size: [.12, .32], gravity: 1.6,
    color1: [1, .96, .84, 1], color2: [.91, .66, .3, .95], colorDead: [.24, .2, .26, 0],
  },
  /** Bàn Đào: peach-pink petals that drift up and cool to rose. */
  peach: {
    texture: '/assets/vfx-circle_03.webp', capacity: 200, maxQueued: 100,
    life: [.7, 1.2], size: [.16, .36], gravity: 1.6,
    color1: [1, .86, .82, 1], color2: [.95, .5, .6, .95], colorDead: [.5, .2, .3, 0],
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
