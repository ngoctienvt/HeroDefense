import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitSpray } from './visual-kit-spray.js';
import { ARRAY_MASK_URL, ARRAY_RADIUS, arrayAlpha, arrayScale, BELL_AFTER_SECONDS, bellFormingFrame,
  bellImpactFrame, KIMTRA_ATLAS, SLAM_DELAY } from './visual-kimtra-timeline.js';

/** Authored bell is 3.6 tall at scale 1. World heights are foreshortened by sin(beta) while the hero billboard is
 * not, so 1.55 (5.6 tall) is what makes the seated bell rise to the crown of the ~4-unit stylized hero sprite. */
export const BELL_SCALE = 1.55;
const MAX_SLOTS = 8;
const MAX_LINKS = 6;
const LINK_SECONDS = .14;
/** Cast without an ability (cancelled/out of zone) gives up after this long. */
const ORPHAN_SECONDS = 1.2;

/** One bell over one recipient. `impactAge` undefined = still forming (caster's windup). */
type Bell = {
  key: string; at: Vector3; sprite?: Sprite; array?: Layer; age: number; windup: number;
  impactAge?: number; delay: number; slammed: boolean; reduced: boolean;
};
type Link = { layer: Layer; age: number };

/**
 * Kim Chung Phản Kích Trận, cast → impact: formation sigil under Kim Tra during the windup (radius = the
 * catalog skill radius), a gold bell forming above him, then on `ability` one bell drops on each recipient
 * (a gold thread first runs to the ally) and slams with dust, shards and a shockwave. The seated shell and
 * the break live in KimtraStatus, driven by the snapshot shield.
 */
export class KimtraUltimate {
  private bells: Bell[] = [];
  private links: Link[] = [];
  private arrayPool: LayerPool;
  private linkPool: LayerPool;
  private serial = 0;

  constructor(scene: Scene, private flipbooks: KitFlipbooks, private spray: KitSpray) {
    const mask = new Texture(ARRAY_MASK_URL, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      undefined, () => debug('visual.kit.asset.error', { asset: 'kimtra-array-mask' }));
    mask.hasAlpha = true;
    this.arrayPool = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'kimtra', `kimtra-array-${this.serial++}`,
      { mask }), 4, 'kimtra-array');
    this.linkPool = new LayerPool(() => createGroundLayer(scene, 'kitLink', 'kimtra', `kimtra-link-${this.serial++}`),
      MAX_LINKS, 'kimtra-link');
  }

  /** Server windup at Kim Tra: sigil + the bell forming overhead. */
  cast(source: string, at: Vector3, windup: number, reduced: boolean): void {
    this.drop(source);
    if (this.bells.length >= MAX_SLOTS) return;
    const bell: Bell = { key: source, at: at.clone(), age: 0, windup, delay: 0, slammed: false, reduced };
    bell.array = this.arrayPool.acquire();
    if (bell.array) {
      const { mesh, material: m } = bell.array;
      mesh.position.set(at.x, .035, at.z);
      mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
      m.setFloat('uFill', .55); m.setFloat('uRim', 1); m.setFloat('uBand', 0); m.setFloat('uSpiral', 0);
      m.setFloat('uRings', 0); m.setFloat('uSwirl', reduced ? 0 : .35);
    }
    if (!reduced) bell.sprite = this.flipbooks.spawn(KIMTRA_ATLAS.bell, at, BELL_SCALE);
    this.bells.push(bell);
  }

  /**
   * `ability skill-h009`, one event per recipient (`at`, origin = Kim Tra). Kim Tra's own bell drops from
   * the windup slot; an ally first gets a gold thread, then its bell forms quickly and drops.
   */
  impact(source: string, origin: Vector3, at: Vector3, reduced: boolean): void {
    const self = origin.subtract(at).lengthSquared() < .25;
    let bell = self ? this.bells.find(entry => entry.key === source && entry.impactAge === undefined) : undefined;
    if (!bell) {
      if (this.bells.length >= MAX_SLOTS) return;
      bell = { key: `${source}>${this.serial++}`, at: at.clone(), age: 0, windup: 0, delay: self ? 0 : LINK_SECONDS,
        slammed: false, reduced };
      if (!reduced) bell.sprite = this.flipbooks.spawn(KIMTRA_ATLAS.bell, at, BELL_SCALE);
      if (!self) this.link(origin, at, reduced);
      this.bells.push(bell);
    }
    bell.impactAge = -bell.delay;
    debug('visual.kimtra.impact', { self, reduced, sprite: Boolean(bell.sprite) });
  }

  tick(dt: number, time: number): void {
    for (let i = this.bells.length - 1; i >= 0; i--) {
      const bell = this.bells[i];
      bell.age += dt;
      if (bell.impactAge !== undefined) bell.impactAge += dt;
      const impact = bell.impactAge !== undefined && bell.impactAge >= 0 ? bell.impactAge : undefined;
      if (bell.array) {
        const m = bell.array.material;
        bell.array.mesh.scaling.setAll(ARRAY_RADIUS * 2 * arrayScale(impact));
        m.setFloat('uAlpha', arrayAlpha(bell.age, bell.windup, impact));
        m.setFloat('uTime', time);
      }
      if (bell.sprite) {
        bell.sprite.cellIndex = impact === undefined
          ? bellFormingFrame(bell.age, bell.windup || LINK_SECONDS)
          : bellImpactFrame(impact);
      }
      if (impact !== undefined && !bell.slammed && impact >= SLAM_DELAY) this.slam(bell);
      const done = impact !== undefined ? impact >= Math.max(BELL_AFTER_SECONDS, .8) : bell.age >= ORPHAN_SECONDS;
      if (done) { this.release(bell); this.bells.splice(i, 1); }
    }
    for (let i = this.links.length - 1; i >= 0; i--) {
      const link = this.links[i];
      link.age += dt;
      const t = link.age / LINK_SECONDS;
      const m = link.layer.material;
      m.setFloat('uHead', Math.min(1, t)); m.setFloat('uTail', Math.max(0, t - 1) * 1.5);
      m.setFloat('uAlpha', 1 - Math.max(0, t - 1.2)); m.setFloat('uTime', time);
      if (t >= 2) { this.linkPool.release(link.layer); this.links.splice(i, 1); }
    }
  }

  clear(): void {
    for (const bell of this.bells) this.release(bell);
    this.bells.length = 0;
    this.links.length = 0;
    this.arrayPool.releaseAll();
    this.linkPool.releaseAll();
  }

  /** A new cast from the same Kim Tra replaces a slot still waiting for its ability. */
  private drop(source: string): void {
    const index = this.bells.findIndex(bell => bell.key === source && bell.impactAge === undefined);
    if (index >= 0) { this.release(this.bells[index]); this.bells.splice(index, 1); }
  }

  private slam(bell: Bell): void {
    bell.slammed = true;
    if (!bell.reduced) {
      this.spray.ring(bell.at, 1.7 * BELL_SCALE, 16, .5, 4.5, 2.5);
      this.spray.rise(bell.at, 1.2, 8);
    }
    debug('visual.kimtra.slam', { reduced: bell.reduced });
  }

  private link(from: Vector3, to: Vector3, reduced: boolean): void {
    const layer = this.linkPool.acquire();
    if (!layer) return;
    const dx = to.x - from.x, dz = to.z - from.z;
    const { mesh, material: m } = layer;
    mesh.scaling.set(Math.hypot(dx, dz), 1, .55);
    mesh.position.set((from.x + to.x) / 2, 2.6, (from.z + to.z) / 2);
    mesh.rotation.y = -Math.atan2(dz, dx);
    mesh.alphaIndex = GROUND_ALPHA_INDEX + 3; // under every actor: heads stay crisp where the thread crosses
    m.setFloat('uWave', .25); m.setFloat('uTaper', 1);
    this.links.push({ layer, age: reduced ? LINK_SECONDS : 0 });
  }

  private release(bell: Bell): void {
    if (bell.sprite) this.flipbooks.release(KIMTRA_ATLAS.bell, bell.sprite);
    if (bell.array) this.arrayPool.release(bell.array);
    bell.sprite = undefined; bell.array = undefined;
  }
}
