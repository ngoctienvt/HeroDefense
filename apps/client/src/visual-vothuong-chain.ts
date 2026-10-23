import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { CHAIN_EXTEND, CHAIN_LIFE, CHAIN_STRIP_URL, chainAlpha, chainReach, chainWidth, stripPlaneWidth } from './visual-vothuong-timeline.js';

/** One snipe per Vô Thường per 100 Nộ: a handful of strips alive at once is already generous. */
const MAX_STRIPS = 8;
/** Waist height: the strip lies at the belt of the casters and under every actor (ground alpha index). */
const STRIP_HEIGHT = 1.1;
/** Leaves his hand, not his centre. */
const HAND_OFFSET = .7;
/** Reduced motion: the full strip, briefly, no growth. */
const STILL_SECONDS = .3;

type Slot = { mesh: Mesh; material: StandardMaterial; texture: Texture };
type Strip = { slot?: Slot; age: number; from: Vector3; dir: { x: number; z: number }; length: number; reduced: boolean };

/**
 * The painted sickle-and-chain strip thrown from Vô Thường's hand to the victim (hook head on the right end: it
 * leads, the chain trails). The mesh is a ground plane at belt height drawn before every actor, so bodies stay
 * crisp where it crosses. Pure presentation; the shot itself is instant on the server.
 */
export class VothuongChain {
  private base: Texture;
  private free: Slot[] = [];
  private created = 0;
  private strips: Strip[] = [];
  private capLogged = false;

  constructor(private scene: Scene) {
    this.base = new Texture(CHAIN_STRIP_URL, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.kit.asset.ready', { asset: 'vothuong-chain-strip' }),
      (_message, error) => debug('visual.kit.asset.error', { asset: 'vothuong-chain-strip', message: String(error ?? 'load failed') }));
    this.base.hasAlpha = true;
    this.base.wrapU = this.base.wrapV = Texture.CLAMP_ADDRESSMODE;
  }

  /** `ability skill-h00H`: `origin` = Vô Thường, `at` = the victim. False when the points coincide. */
  throwAt(origin: Vector3, at: Vector3, reduced: boolean): boolean {
    const dx = at.x - origin.x, dz = at.z - origin.z;
    const distance = Math.hypot(dx, dz);
    if (distance < .8) { debug('visual.vothuong.chain.skip', { reason: 'too-close' }); return false; }
    const dir = { x: dx / distance, z: dz / distance };
    const offset = Math.min(HAND_OFFSET, distance * .3);
    this.strips.push({ age: reduced ? CHAIN_EXTEND : 0, from: new Vector3(origin.x + dir.x * offset, STRIP_HEIGHT, origin.z + dir.z * offset),
      dir, length: distance - offset, reduced });
    return true;
  }

  tick(dt: number): void {
    for (let i = this.strips.length - 1; i >= 0; i--) {
      const strip = this.strips[i];
      if (!strip.slot) {
        strip.slot = this.acquire();
        if (!strip.slot) { this.strips.splice(i, 1); continue; }
        strip.slot.mesh.rotation.y = -Math.atan2(strip.dir.z, strip.dir.x);
        strip.slot.mesh.setEnabled(true);
      }
      strip.age += dt;
      const life = strip.reduced ? CHAIN_EXTEND + STILL_SECONDS : CHAIN_LIFE;
      if (strip.age >= life) { this.release(strip.slot); this.strips.splice(i, 1); continue; }
      this.layout(strip);
    }
  }

  clear(): void {
    for (const strip of this.strips) if (strip.slot) this.release(strip.slot);
    this.strips.length = 0;
    this.capLogged = false;
  }

  private layout(strip: Strip): void {
    const slot = strip.slot;
    if (!slot) return;
    const reach = Math.max(.02, chainReach(strip.age));
    const shown = strip.length * reach;
    slot.mesh.position.set(strip.from.x + strip.dir.x * shown / 2, STRIP_HEIGHT, strip.from.z + strip.dir.z * shown / 2);
    slot.mesh.scaling.set(shown, 1, stripPlaneWidth(strip.length) * chainWidth(strip.age));
    // Right end of the painting (the hook head) always sits at the growing tip.
    slot.texture.uScale = reach;
    slot.texture.uOffset = 1 - reach;
    slot.material.alpha = chainAlpha(strip.reduced ? Math.min(strip.age, CHAIN_EXTEND) : strip.age);
  }

  private acquire(): Slot | undefined {
    const pooled = this.free.pop();
    if (pooled) return pooled;
    if (this.created >= MAX_STRIPS) {
      if (!this.capLogged) { this.capLogged = true; debug('visual.kit.pool.cap', { pool: 'vothuong-chain' }); }
      return undefined;
    }
    const name = `vothuong-chain-${this.created++}`;
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
