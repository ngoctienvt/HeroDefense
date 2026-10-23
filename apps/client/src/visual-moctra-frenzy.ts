import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { KitSpray } from './visual-kit-spray.js';
import { AWAKEN_AFTER_SECONDS, awakenFormingFrame, awakenImpactFrame, LASH_OUT_DELAY, MOCTRA_ATLAS, ORPHAN_SECONDS,
  WREATH_FADE, WREATH_RADIUS, WREATH_SPIN, WREATH_URL, wreathAlpha, wreathKick, wreathScale } from './visual-moctra-timeline.js';

/** Authored awaken cell covers ~6 world units; the vine spiral then reaches the stylized hero's shoulders. */
const AWAKEN_SCALE = 1;
const MAX_AWAKEN = 6;
/** Reduced motion keeps the telegraph and the activation as still frames: sprouts (3), then the X slash (6). */
const STILL_SPROUT = 3;
const STILL_SLASH = 6;
const STILL_SECONDS = .3;
const MAX_WREATHS = 6;

type Awaken = { key: string; at: Vector3; sprite?: Sprite; age: number; windup: number; impactAge?: number; burst: boolean; reduced: boolean };
type Wreath = { mesh: Mesh; material: StandardMaterial; at: Vector3; age: number; sinceMark: number; sinceKick: number; reduced: boolean };

/**
 * Ngô Câu Mộc Ảnh Vũ on Mộc Tra himself. Cast (server windup): lime cracks and vine sprouts break the ground
 * (flipbook 0-3). Ability: the vines coil up, twin hook-sword afterimages cross-slash, lash out with a leaf
 * burst (4-15). Then, for as long as the snapshot holds `berserk`, a thorny wreath with two woven hook
 * blades whirls under his feet (painted ground decal, under every actor) and withers when Cuồng Vũ ends.
 */
export class MoctraFrenzy {
  private awakens: Awaken[] = [];
  private wreaths = new Map<string, Wreath>();
  private free: Wreath[] = [];
  private texture: Texture;
  private created = 0;

  constructor(private scene: Scene, private flipbooks: KitFlipbooks, private spray: KitSpray) {
    this.texture = new Texture(WREATH_URL, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.kit.asset.ready', { asset: 'moctra-wreath' }),
      (_message, error) => debug('visual.kit.asset.error', { asset: 'moctra-wreath', message: String(error ?? 'load failed') }));
    this.texture.hasAlpha = true;
  }

  /** `cast skill-h00A` at Mộc Tra: the sprouts hold on frame 3 until the ability. */
  cast(source: string, at: Vector3, windup: number, reduced: boolean): void {
    this.drop(source);
    if (this.awakens.length >= MAX_AWAKEN) return;
    const entry: Awaken = { key: source, at: at.clone(), age: 0, windup, burst: false, reduced };
    entry.sprite = this.flipbooks.spawn(MOCTRA_ATLAS.awaken, at, AWAKEN_SCALE);
    this.awakens.push(entry);
  }

  /** `ability skill-h00A`: centred on Mộc Tra (`origin`), never on the enemy the event names. */
  awaken(source: string, origin: Vector3, reduced: boolean): void {
    let entry = this.awakens.find(item => item.key === source && item.impactAge === undefined);
    if (!entry) {
      if (this.awakens.length >= MAX_AWAKEN) return;
      entry = { key: source, at: origin.clone(), age: 0, windup: 0, burst: false, reduced };
      entry.sprite = this.flipbooks.spawn(MOCTRA_ATLAS.awaken, origin, AWAKEN_SCALE);
      this.awakens.push(entry);
    }
    entry.at.copyFrom(origin);
    entry.impactAge = 0;
    if (entry.sprite) this.flipbooks.place(MOCTRA_ATLAS.awaken, entry.sprite, origin, AWAKEN_SCALE);
    debug('visual.moctra.awaken', { reduced, sprite: Boolean(entry.sprite) });
  }

  /** Snapshot marker `frenzy` (berserk on Mộc Tra), every frame it holds. */
  mark(id: string, at: Vector3, reduced: boolean): void {
    let wreath = this.wreaths.get(id);
    if (!wreath) {
      const created = this.acquire();
      if (!created) return;
      wreath = created;
      wreath.age = 0; wreath.sinceKick = 1; wreath.reduced = reduced;
      wreath.mesh.setEnabled(true);
      wreath.mesh.rotation.y = Math.random() * Math.PI * 2;
      this.wreaths.set(id, wreath);
      debug('visual.moctra.frenzy.start', { reduced });
    }
    wreath.at.copyFrom(at);
    wreath.sinceMark = 0;
  }

  /** A vine shot left this Mộc Tra: the whirl kicks outward. */
  kick(id: string): void {
    const wreath = this.wreaths.get(id);
    if (wreath) wreath.sinceKick = 0;
  }

  tick(dt: number): void {
    for (let i = this.awakens.length - 1; i >= 0; i--) {
      const entry = this.awakens[i];
      entry.age += dt;
      if (entry.impactAge !== undefined) entry.impactAge += dt;
      if (entry.sprite && entry.reduced) entry.sprite.cellIndex = entry.impactAge === undefined ? STILL_SPROUT : STILL_SLASH;
      else if (entry.sprite) {
        entry.sprite.cellIndex = entry.impactAge === undefined
          ? awakenFormingFrame(entry.age, entry.windup || .12) : awakenImpactFrame(entry.impactAge);
      }
      if (entry.impactAge !== undefined && !entry.burst && entry.impactAge >= LASH_OUT_DELAY) {
        entry.burst = true;
        if (!entry.reduced) this.spray.ring(entry.at, WREATH_RADIUS, 18, .9, 4.5, 2.2);
      }
      const after = entry.reduced ? STILL_SECONDS : AWAKEN_AFTER_SECONDS;
      const done = entry.impactAge !== undefined ? entry.impactAge >= after : entry.age >= ORPHAN_SECONDS;
      if (done) { this.flipbooks.release(MOCTRA_ATLAS.awaken, entry.sprite); this.awakens.splice(i, 1); }
    }
    for (const [id, wreath] of this.wreaths) {
      wreath.age += dt; wreath.sinceMark += dt; wreath.sinceKick += dt;
      if (wreath.sinceMark >= WREATH_FADE) { this.release(wreath); this.wreaths.delete(id); continue; }
      // Marks arrive every frame while berserk holds; the first missed frame starts the wither.
      const sinceLastMark = Math.max(0, wreath.sinceMark - dt * 1.5);
      const scale = WREATH_RADIUS * 2 * wreathScale(wreath.age) * (wreath.reduced ? 1 : wreathKick(wreath.sinceKick));
      wreath.mesh.position.set(wreath.at.x, .04, wreath.at.z);
      wreath.mesh.scaling.set(scale, 1, scale);
      if (!wreath.reduced) wreath.mesh.rotation.y -= WREATH_SPIN * dt;
      wreath.material.alpha = wreathAlpha(wreath.age, sinceLastMark);
    }
  }

  clear(): void {
    for (const entry of this.awakens) this.flipbooks.release(MOCTRA_ATLAS.awaken, entry.sprite);
    this.awakens.length = 0;
    for (const wreath of this.wreaths.values()) this.release(wreath);
    this.wreaths.clear();
  }

  /** A new cast from the same Mộc Tra replaces a slot still waiting for its ability. */
  private drop(source: string): void {
    const index = this.awakens.findIndex(entry => entry.key === source && entry.impactAge === undefined);
    if (index < 0) return;
    this.flipbooks.release(MOCTRA_ATLAS.awaken, this.awakens[index].sprite);
    this.awakens.splice(index, 1);
  }

  private acquire(): Wreath | undefined {
    const pooled = this.free.pop();
    if (pooled) return pooled;
    if (this.created >= MAX_WREATHS) { debug('visual.kit.pool.cap', { pool: 'moctra-wreath' }); return undefined; }
    const name = `moctra-wreath-${this.created++}`;
    const mesh = MeshBuilder.CreateGround(`kit-${name}`, { width: 1, height: 1 }, this.scene);
    const material = new StandardMaterial(name, this.scene);
    material.diffuseTexture = this.texture;
    material.emissiveTexture = this.texture;
    material.diffuseColor = material.emissiveColor = Color3.White();
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    material.useAlphaFromDiffuseTexture = true;
    material.disableDepthWrite = true; // like kitMaterial: the front of the ring must not slice the hero's legs
    mesh.material = material;
    mesh.isPickable = false;
    mesh.alphaIndex = GROUND_ALPHA_INDEX + 1; // floor decal: every actor draws over it
    mesh.setEnabled(false);
    return { mesh, material, at: Vector3.Zero(), age: 0, sinceMark: 0, sinceKick: 1, reduced: false };
  }

  private release(wreath: Wreath): void {
    wreath.mesh.setEnabled(false);
    this.free.push(wreath);
  }
}
