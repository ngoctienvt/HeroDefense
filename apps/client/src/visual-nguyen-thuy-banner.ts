import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { farDirection, screenUp } from './visual-kit-billboard.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { KitSpray } from './visual-kit-spray.js';
import { motion } from './visual-kit-timeline.js';
import { ntId, placeBillboard, setFrame } from './visual-nguyen-thuy-art.js';
import { BANNER_RELEASE_SECONDS, bannerAlpha, bannerCastFrame, bannerReleaseFrame, bannerScale } from './visual-nguyen-thuy-timeline.js';

const MAX_BANNERS = 4;
/** Banner width in world units: wider than the hero so it frames him like Bất Chu Sơn frames Cộng Công. */
const BANNER_SIZE = 8.6;
const BANNER_BEHIND = 1.4;
const BANNER_LIFT = 1.5;
/** Ground seal radius: a local charge ring, never the R11 reach of the skill. */
const SEAL_RADIUS = 3.9;
const THREAD_COUNT = 3;
/** The resolve may never arrive (reconnect, killed caster): free the charge shortly after the windup. */
const LOST_GRACE = 1;

type Banner = {
  source: string; at: Vector3; age: number; windup: number; reduced: boolean; releaseAge?: number;
  mesh?: Mesh; seal?: Layer; core?: Layer; threads: Layer[];
};

/**
 * Bàn Cổ Phướng opening on the caster. Windup: the silk banner opens behind the hero (flipbook frames 0–3), a jade
 * seal tightens under his feet and three Hỗn Độn strands curl out of him. Resolve: the banner splits into three
 * strands, holds its pinwheel, then dissolves (frames 4–15), after the sword streams have left.
 */
export class NguyenThuyBanner {
  private seals: LayerPool;
  private threads: LayerPool;
  private banners: Banner[] = [];
  private serial = 0;

  constructor(private scene: Scene, private art: KitPainted, private spray: KitSpray) {
    this.seals = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitGround', 'chaos', `nguyenthuy-seal-${this.serial++}`);
      layer.material.setFloat('uBand', 0);
      return layer;
    }, MAX_BANNERS * 2, 'nguyenthuy-seal');
    this.threads = new LayerPool(() => createGroundLayer(scene, 'kitLink', 'chaos', `nguyenthuy-thread-${this.serial++}`),
      MAX_BANNERS * THREAD_COUNT, 'nguyenthuy-thread');
  }

  cast(source: string, at: Vector3, windup: number, reduced: boolean): void {
    this.drop(source);
    if (this.banners.length >= MAX_BANNERS) { debug('visual.nguyenthuy.cap', { layer: 'banner' }); return; }
    this.banners.push(this.create(source, at, Math.max(.05, windup), reduced));
    debug('visual.nguyenthuy.cast', { windup, reduced });
  }

  /** Server resolve. A missing cast (lobby practice, reconnect) starts directly at the split. */
  release(source: string, at: Vector3, reduced: boolean): void {
    let banner = this.banners.find(b => b.source === source && b.releaseAge === undefined);
    if (!banner) {
      if (this.banners.length >= MAX_BANNERS) { debug('visual.nguyenthuy.cap', { layer: 'banner' }); return; }
      banner = this.create(source, at, .05, reduced);
      banner.age = .05;
      this.banners.push(banner);
    }
    banner.releaseAge = 0;
    banner.at.copyFrom(at);
    banner.reduced = reduced;
    if (!reduced) this.spray.ring(at, 1.6, 34, 1.3, 5.2, 4.5);
    debug('visual.nguyenthuy.banner.release', { lateCast: banner.age <= .06, reduced });
  }

  tick(dt: number, time: number): void {
    const up = screenUp(this.scene);
    const far = farDirection(this.scene);
    for (let i = this.banners.length - 1; i >= 0; i--) {
      const banner = this.banners[i];
      banner.age += dt;
      if (banner.releaseAge !== undefined) banner.releaseAge += dt;
      const finished = (banner.releaseAge ?? 0) >= BANNER_RELEASE_SECONDS;
      const lost = banner.releaseAge === undefined && banner.age >= banner.windup + LOST_GRACE;
      if (lost) debug('visual.nguyenthuy.charge.cancel', { reason: 'resolve-not-received' });
      if (finished || lost) { this.free(banner); this.banners.splice(i, 1); continue; }
      this.drawBanner(banner, up, far);
      this.drawGround(banner, time);
      this.drawThreads(banner, time);
    }
  }

  clear(): void {
    for (const banner of this.banners) this.free(banner);
    this.banners.length = 0;
    this.seals.releaseAll();
    this.threads.releaseAll();
  }

  private create(source: string, at: Vector3, windup: number, reduced: boolean): Banner {
    const banner: Banner = { source, at: at.clone(), age: 0, windup, reduced, threads: [] };
    banner.seal = this.seals.acquire(); banner.core = this.seals.acquire();
    for (const layer of [banner.seal, banner.core]) if (layer) layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
    if (!reduced) for (let i = 0; i < THREAD_COUNT; i++) {
      const thread = this.threads.acquire();
      if (thread) banner.threads.push(thread);
    }
    return banner;
  }

  private drawBanner(banner: Banner, up: Vector3, far: Vector3): void {
    banner.mesh ??= this.art.acquire(ntId('banner'));
    const mesh = banner.mesh;
    if (!mesh) return;
    const release = banner.releaseAge;
    const frame = release === undefined ? bannerCastFrame(banner.age, banner.windup, banner.reduced)
      : bannerReleaseFrame(release, banner.reduced);
    const feet = banner.at.add(far.scale(BANNER_BEHIND));
    placeBillboard(mesh, 'banner', feet, BANNER_SIZE * bannerScale(banner.age, banner.windup, banner.reduced), up, BANNER_LIFT);
    setFrame(this.art, mesh, 'banner', frame);
    mesh.visibility = bannerAlpha(banner.age, banner.windup, release);
  }

  /** Seal tightens to the charge, then cools out 0.25 s after the resolve. */
  private drawGround(banner: Banner, time: number): void {
    const charge = Math.min(1, banner.age / banner.windup);
    const fade = banner.releaseAge === undefined ? 1 : Math.max(0, 1 - banner.releaseAge / .28);
    const motionOn = banner.reduced ? 0 : 1;
    if (banner.seal) {
      this.shape(banner.seal, banner.at, SEAL_RADIUS * 2 * (banner.reduced ? 1 : .55 + .45 * motion.easeOut(charge)), .05);
      this.uniforms(banner.seal.material, time, fade * (.3 + .6 * charge), .55 * charge, charge, 1.2 * motionOn, .7 * motionOn);
    }
    if (banner.core) {
      this.shape(banner.core, banner.at, 2.3 * 2 * (banner.reduced ? 1 : 1 - .25 * charge), .07);
      this.uniforms(banner.core.material, time, fade * charge * (banner.reduced ? .6 : 1), .8, .85, -4 * motionOn, 0);
    }
    if (!banner.reduced && banner.releaseAge === undefined && Math.random() < .5) this.spray.rise(banner.at, 2.8, 2);
  }

  /** Three strands unwind from the hero while the charge builds, rotating slowly; they retract at the resolve. */
  private drawThreads(banner: Banner, time: number): void {
    const charge = Math.min(1, banner.age / banner.windup);
    const release = banner.releaseAge === undefined ? 0 : Math.min(1, banner.releaseAge / .22);
    banner.threads.forEach((thread, i) => {
      const angle = time * 1.1 + i * Math.PI * 2 / THREAD_COUNT;
      const length = (.8 + 2.9 * motion.easeOut(charge)) * (1 - .6 * release);
      const dx = Math.cos(angle), dz = Math.sin(angle);
      thread.mesh.scaling.set(length, 1, .32);
      thread.mesh.position.set(banner.at.x + dx * (length / 2 + .5), 1.3 + i * .2, banner.at.z + dz * (length / 2 + .5));
      thread.mesh.rotation.y = -Math.atan2(dz, dx);
      const m = thread.material;
      m.setFloat('uTime', time); m.setFloat('uHead', charge); m.setFloat('uTail', Math.max(0, charge - .7));
      m.setFloat('uWave', .3); m.setFloat('uTaper', .6);
      m.setFloat('uAlpha', (1 - release) * (.35 + .6 * charge));
    });
  }

  private shape(layer: Layer, at: Vector3, diameter: number, y: number): void {
    layer.mesh.position.set(at.x, y, at.z);
    layer.mesh.scaling.setAll(diameter);
  }

  private uniforms(m: ShaderMaterial, time: number, alpha: number, fill: number, rim: number, swirl: number, rings: number): void {
    m.setFloat('uTime', time); m.setFloat('uAlpha', alpha); m.setFloat('uFill', fill);
    m.setFloat('uRim', rim); m.setFloat('uSwirl', swirl); m.setFloat('uRings', rings);
  }

  private drop(source: string): void {
    for (let i = this.banners.length - 1; i >= 0; i--) if (this.banners[i].source === source) {
      this.free(this.banners[i]); this.banners.splice(i, 1);
    }
  }

  private free(banner: Banner): void {
    this.art.release(banner.mesh);
    if (banner.seal) this.seals.release(banner.seal);
    if (banner.core) this.seals.release(banner.core);
    for (const thread of banner.threads) this.threads.release(thread);
    banner.mesh = undefined; banner.seal = undefined; banner.core = undefined; banner.threads = [];
  }
}
