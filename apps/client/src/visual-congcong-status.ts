import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { debug } from './debug.js';
import { actorAlphaIndex } from './visual-kit-depth.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import { createShellLayer, LayerPool, TouchedLayers, type Layer } from './visual-kit-layers.js';
import type { KitSpray } from './visual-kit-spray.js';
import { BOLT_SECONDS, boltArcHeight, CAGE_SHATTER_SECONDS, CONGCONG_ATLAS, iceCageFrame, splashFrame,
  SPLASH_LIFE } from './visual-congcong-timeline.js';

const MAX_WARDS = 20;
const MAX_BOLTS = 12;
const WARD_BURST = .26;
const CAGE_SCALE = 1.15;
const CAGE_TOWARD_CAMERA = .3; // camera sits on +Z; keep the translucent ice in front of the enemy billboard
const CAGE_GRACE = .2;

type WardState = { burst?: number };
type Bolt = { layer: Layer; from: Vector3; to: Vector3; age: number };
type Cage = { sprite: Sprite; age: number; unseen: number; shatterAge?: number; reduced: boolean };

/** Snapshot-driven Hắc Thủy wards and black-ice cages, plus the water bolts that deliver the ward. */
export class CongcongStatus {
  private wardPool: LayerPool;
  private wards: TouchedLayers<WardState>;
  private boltPool: LayerPool;
  private bolts: Bolt[] = [];
  private cages = new Map<string, Cage>();
  private landings: { sprite: Sprite; age: number }[] = [];
  private serial = 0;

  constructor(private scene: Scene, private flipbooks: KitFlipbooks, private spray: KitSpray) {
    this.wardPool = new LayerPool(() => this.shell('ward', 24), MAX_WARDS, 'congcong-ward');
    this.wards = new TouchedLayers(this.wardPool, () => ({}));
    this.boltPool = new LayerPool(() => this.shell('bolt', 14), MAX_BOLTS, 'congcong-bolt');
  }

  markWard(id: string, at: Vector3): void {
    // A ward already bursting is replaced by a fresh one when the snapshot shows the status again.
    const ward = this.wards.touch(id, state => state.burst !== undefined);
    if (!ward) return;
    const mesh = ward.layer.mesh;
    mesh.position.set(at.x, 1.75, at.z);
    // Drawn just before its own hero: the body stays crisp on top, only the water rim shows around it.
    mesh.alphaIndex = actorAlphaIndex(this.scene, at.x, at.z) - 1;
    mesh.scaling.set(2.7, 3.7, 2.7);
  }

  /** Water bolt from Cộng Công to an ally receiving the ward (server event `shield-h01G`). */
  arrive(from: Vector3, to: Vector3, reduced: boolean): void {
    // Cộng Công shields himself too: no bolt and no crown splash over his own body.
    if (from.subtract(to).lengthSquared() < .25) { if (!reduced) this.spray.ring(to, 1, 8, 1.4, 2, 3); return; }
    if (reduced) { this.land(to, reduced); return; }
    const layer = this.boltPool.acquire();
    if (!layer) { this.land(to, reduced); return; }
    layer.mesh.scaling.setAll(.85);
    this.bolts.push({ layer, from: from.clone(), to: to.clone(), age: 0 });
  }

  /** Called each frame for an enemy frozen by Cộng Công's wave (see battlefield routing). */
  markFrozen(id: string, at: Vector3, reduced: boolean): void {
    let cage = this.cages.get(id);
    if (!cage) {
      const sprite = this.flipbooks.spawn(CONGCONG_ATLAS.icecage, at, CAGE_SCALE);
      if (!sprite) return;
      cage = { sprite, age: 0, unseen: 0, reduced };
      this.cages.set(id, cage);
      if (!reduced) this.spray.ring(at, .8, 6, 1.2, 1.5, 2);
    }
    cage.unseen = 0;
    if (cage.shatterAge === undefined)
      this.flipbooks.place(CONGCONG_ATLAS.icecage, cage.sprite, new Vector3(at.x, 0, at.z + CAGE_TOWARD_CAMERA), CAGE_SCALE);
  }

  tick(dt: number, time: number): void {
    this.wards.sweep((ward, touched) => {
      const { material, mesh } = ward.layer;
      material.setFloat('uTime', time);
      if (ward.state.burst === undefined && touched) { material.setFloat('uAlpha', 1); material.setFloat('uDissolve', 0); return false; }
      if (ward.state.burst === undefined) {
        ward.state.burst = 0;
        this.spray.ring(mesh.position.subtract(new Vector3(0, 1.75, 0)), 1.3, 14, 2.4, 3.5, 2.5);
      }
      ward.state.burst += dt;
      const t = ward.state.burst / WARD_BURST;
      mesh.scaling.set(2.7 * (1 + .35 * t), 3.7 * (1 - .3 * t), 2.7 * (1 + .35 * t));
      material.setFloat('uDissolve', t);
      material.setFloat('uAlpha', 1 - t * .5);
      return t >= 1;
    });
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const bolt = this.bolts[i];
      bolt.age += dt;
      const t = Math.min(1, bolt.age / BOLT_SECONDS);
      const at = Vector3.Lerp(bolt.from, bolt.to, t);
      at.y = 1.2 + boltArcHeight(t, 2.6);
      bolt.layer.mesh.position.copyFrom(at);
      bolt.layer.material.setFloat('uTime', time);
      if (Math.random() < .7) this.spray.trail(at, new Vector3(0, -1, 0), 1);
      if (t >= 1) {
        this.land(bolt.to, false);
        this.boltPool.release(bolt.layer);
        this.bolts.splice(i, 1);
      }
    }
    for (const [id, cage] of this.cages) {
      cage.age += dt;
      cage.unseen += dt;
      if (cage.shatterAge === undefined && cage.unseen > CAGE_GRACE) {
        cage.shatterAge = cage.age;
        if (!cage.reduced) this.spray.ring(cage.sprite.position.subtract(new Vector3(0, 1, 0)), .9, 10, 1.4, 3, 3);
      }
      if (cage.shatterAge !== undefined && (cage.reduced || cage.age - cage.shatterAge >= CAGE_SHATTER_SECONDS)) {
        this.flipbooks.release(CONGCONG_ATLAS.icecage, cage.sprite);
        this.cages.delete(id);
        continue;
      }
      cage.sprite.cellIndex = cage.reduced ? 6 : iceCageFrame(cage.age, cage.shatterAge);
    }
    for (let i = this.landings.length - 1; i >= 0; i--) {
      const landing = this.landings[i];
      landing.age += dt;
      if (landing.age >= SPLASH_LIFE) { this.flipbooks.release(CONGCONG_ATLAS.splash, landing.sprite); this.landings.splice(i, 1); continue; }
      landing.sprite.cellIndex = splashFrame(landing.age);
    }
  }

  clear(): void {
    this.wards.clear();
    this.wardPool.releaseAll();
    this.bolts.length = 0;
    this.boltPool.releaseAll();
    for (const cage of this.cages.values()) this.flipbooks.release(CONGCONG_ATLAS.icecage, cage.sprite);
    this.cages.clear();
    for (const landing of this.landings) this.flipbooks.release(CONGCONG_ATLAS.splash, landing.sprite);
    this.landings.length = 0;
  }

  private land(at: Vector3, reduced: boolean): void {
    if (!reduced) {
      const sprite = this.flipbooks.spawn(CONGCONG_ATLAS.splash, new Vector3(at.x, 0, at.z), .55);
      if (sprite) this.landings.push({ sprite, age: 0 });
      this.spray.ring(at, .9, 10, 1.6, 2.5, 3.5);
    }
    debug('visual.congcong.shield', { reduced });
  }

  private shell(kind: string, segments: number): Layer {
    return createShellLayer(this.scene, 'blackwater', `congcong-${kind}-${this.serial++}`, segments);
  }
}
