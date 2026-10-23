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
import { HIT_DELAY, HIT_SECONDS, hitFrame, LASH_EXTEND, LASH_LIFE, lashAlpha, lashPlaneWidth, lashReach, lashWidth,
  MOCTRA_ATLAS, VINE_LASH_URL } from './visual-moctra-timeline.js';

/** ~4-5 shots/s per Mộc Tra in Cuồng Vũ; with four players this keeps the lashes bounded. */
const MAX_LASHES = 8;
/** Waist height: the strip sits under every actor (ground alpha index) so bodies stay crisp where it crosses. */
const LASH_HEIGHT = 1;
/** Leaves the hand, not the hero's centre. */
const HAND_OFFSET = .45;
/** Impact sprite sits a little toward Mộc Tra so the slash reads in front of the enemy, not inside it. */
const HIT_NUDGE = .35;
const HIT_SCALE = 1;

type Slot = { mesh: Mesh; material: StandardMaterial; texture: Texture };
type Lash = {
  slot: Slot; age: number; from: Vector3; dir: { x: number; z: number }; length: number;
  at: Vector3; hit?: Sprite; struck: boolean; reduced: boolean;
};

/**
 * Kiếm khí dây leo: the Codex-painted thorny vine strip whose right end is a jade hook-sword blade. It
 * grows from Mộc Tra to the enemy with the texture window sliding so the hook always leads, holds, thins
 * and fades; when it strikes, the `moctra-hit` flipbook throws the hook slash, thorns and poison drops.
 */
export class MoctraLashes {
  private base: Texture;
  private free: Slot[] = [];
  private created = 0;
  private lashes: Lash[] = [];
  private capLogged = false;

  constructor(private scene: Scene, private flipbooks: KitFlipbooks, private spray: KitSpray) {
    this.base = new Texture(VINE_LASH_URL, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.kit.asset.ready', { asset: 'moctra-vine-lash' }),
      (_message, error) => debug('visual.kit.asset.error', { asset: 'moctra-vine-lash', message: String(error ?? 'load failed') }));
    this.base.hasAlpha = true;
    this.base.wrapU = this.base.wrapV = Texture.CLAMP_ADDRESSMODE;
  }

  /** One `vine-beam-h00A` attack event: `origin` = Mộc Tra, `at` = the enemy it hits. */
  shoot(origin: Vector3, at: Vector3, reduced: boolean): boolean {
    const dx = at.x - origin.x, dz = at.z - origin.z;
    const distance = Math.hypot(dx, dz);
    if (distance < .3) { debug('visual.moctra.lash.skip', { reason: 'degenerate' }); return false; }
    const slot = this.acquire();
    if (!slot) return false;
    const dir = { x: dx / distance, z: dz / distance };
    const offset = Math.min(HAND_OFFSET, distance * .3);
    const from = new Vector3(origin.x + dir.x * offset, LASH_HEIGHT, origin.z + dir.z * offset);
    slot.mesh.rotation.y = -Math.atan2(dir.z, dir.x);
    slot.mesh.setEnabled(true);
    this.lashes.push({ slot, age: reduced ? LASH_EXTEND : 0, from, dir, length: distance - offset, at: at.clone(),
      struck: false, reduced });
    return true;
  }

  tick(dt: number): void {
    for (let i = this.lashes.length - 1; i >= 0; i--) {
      const lash = this.lashes[i];
      lash.age += dt;
      if (!lash.struck && lash.age >= HIT_DELAY) this.strike(lash);
      if (lash.hit) {
        const hitAge = lash.age - HIT_DELAY;
        if (hitAge >= HIT_SECONDS) { this.flipbooks.release(MOCTRA_ATLAS.hit, lash.hit); lash.hit = undefined; }
        else lash.hit.cellIndex = hitFrame(hitAge);
      }
      if (lash.age >= LASH_LIFE && !lash.hit) { this.release(lash.slot); this.lashes.splice(i, 1); continue; }
      this.layout(lash);
    }
  }

  clear(): void {
    for (const lash of this.lashes) {
      if (lash.hit) this.flipbooks.release(MOCTRA_ATLAS.hit, lash.hit);
      this.release(lash.slot);
    }
    this.lashes.length = 0;
    this.capLogged = false;
  }

  private layout(lash: Lash): void {
    const { mesh, material, texture } = lash.slot;
    if (lash.age >= LASH_LIFE) { mesh.setEnabled(false); return; }
    const reach = Math.max(.02, lashReach(lash.age));
    const shown = lash.length * reach;
    mesh.position.set(lash.from.x + lash.dir.x * shown / 2, LASH_HEIGHT, lash.from.z + lash.dir.z * shown / 2);
    mesh.scaling.set(shown, 1, lashPlaneWidth(lash.length) * lashWidth(lash.age));
    // Right end of the painting (the hook blade) always sits at the growing tip.
    texture.uScale = reach;
    texture.uOffset = 1 - reach;
    material.alpha = lashAlpha(lash.age);
  }

  private strike(lash: Lash): void {
    lash.struck = true;
    if (lash.reduced) return;
    const at = new Vector3(lash.at.x - lash.dir.x * HIT_NUDGE, 0, lash.at.z - lash.dir.z * HIT_NUDGE);
    lash.hit = this.flipbooks.spawn(MOCTRA_ATLAS.hit, at, HIT_SCALE);
    // The painted crescent travels toward screen-right; mirror it when the vine flies screen-left.
    const camera = this.scene.activeCamera;
    if (lash.hit && camera) {
      const right = camera.getDirection(Vector3.Right());
      lash.hit.invertU = lash.dir.x * right.x + lash.dir.z * right.z < 0;
    }
    this.spray.trail(new Vector3(lash.at.x, .9, lash.at.z), new Vector3(lash.dir.x * 1.6, 1.4, lash.dir.z * 1.6), 4);
  }

  private acquire(): Slot | undefined {
    const pooled = this.free.pop();
    if (pooled) return pooled;
    if (this.created >= MAX_LASHES) {
      if (!this.capLogged) { this.capLogged = true; debug('visual.kit.pool.cap', { pool: 'moctra-lash' }); }
      return undefined;
    }
    const name = `moctra-lash-${this.created++}`;
    const mesh = MeshBuilder.CreateGround(`kit-${name}`, { width: 1, height: 1 }, this.scene);
    const texture = this.base.clone();
    texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    const material = new StandardMaterial(name, this.scene);
    material.diffuseTexture = texture;
    material.emissiveTexture = texture;
    material.diffuseColor = material.emissiveColor = Color3.White();
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    material.useAlphaFromDiffuseTexture = true;
    material.backFaceCulling = false;
    material.disableDepthWrite = true; // like kitMaterial: actors drawn later must not be clipped by the quad
    mesh.material = material;
    mesh.isPickable = false;
    mesh.alphaIndex = GROUND_ALPHA_INDEX + 3;
    mesh.setEnabled(false);
    return { mesh, material, texture };
  }

  private release(slot: Slot): void {
    slot.mesh.setEnabled(false);
    this.free.push(slot);
  }
}
