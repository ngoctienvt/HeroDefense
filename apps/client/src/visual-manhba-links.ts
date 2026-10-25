import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { ManhbaBonds } from './visual-manhba-bonds.js';
import { BOND_FADE, BOND_SECONDS, HAND_LINK_SECONDS, handLinkAlpha, LINK_EXTEND, LINK_STRIP_URL, linkAlpha, linkDelay,
  linkPlaneWidth, linkReach, linkWidth, MAX_LINKS } from './visual-manhba-timeline.js';

/** 4 hops per cast, ~3 casts overlapping on a four-player board, plus the hand ropes. */
const MAX_ROPES = 16;
/** Waist height: ropes sit under every actor (ground alpha index) so bodies stay crisp where they cross. */
const ROPE_HEIGHT = 1.1;
/** Leaves her staff hand, not her centre. */
const HAND_OFFSET = .5;

type Slot = { mesh: Mesh; material: StandardMaterial; texture: Texture };
type Rope = {
  slot?: Slot; hop: number; delay: number; age: number; hand: boolean; reduced: boolean;
  fromKey?: string; toKey: string; from: Vector3; to: Vector3; arrived: boolean; sinceEnd: number;
};

/**
 * Soul ropes in SERVER ORDER: hop 0 leaves her hand for target 1, hop i leaves target i for target i + 1 (the event's
 * `targets` are already the chain order). Each rope is the painted strip (knot head on the right) growing head first
 * to the next monster; when the head lands `bonds.link` pulses the node and starts the ring. Hops 1+ stay as the
 * Đồng Mệnh bond, following the monsters from snapshot marks, until the bond ends; the hand rope only launches.
 */
export class ManhbaLinks {
  private base: Texture;
  private free: Slot[] = [];
  private created = 0;
  private ropes: Rope[] = [];
  private capLogged = false;
  private time = 0;

  constructor(private scene: Scene, private bonds: ManhbaBonds) {
    this.base = new Texture(LINK_STRIP_URL, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.kit.asset.ready', { asset: 'manhba-link-strip' }),
      (_message, error) => debug('visual.kit.asset.error', { asset: 'manhba-link-strip', message: String(error ?? 'load failed') }));
    this.base.hasAlpha = true;
    this.base.wrapU = this.base.wrapV = Texture.CLAMP_ADDRESSMODE;
  }

  /** `ability skill-h00I`: `origin` = Mạnh Bà, `points` = the linked monsters in chain order, `keys` their bond keys. Returns hops started. */
  cast(origin: Vector3, points: readonly Vector3[], keys: readonly string[], reduced: boolean): number {
    const hops = Math.min(points.length, MAX_LINKS);
    let started = 0;
    for (let hop = 0; hop < hops; hop++) {
      const fromPoint = hop === 0 ? origin : points[hop - 1];
      const toPoint = points[hop];
      if (Math.hypot(toPoint.x - fromPoint.x, toPoint.z - fromPoint.z) < .3) { debug('visual.manhba.link.skip', { hop, reason: 'too-close' }); continue; }
      this.ropes.push({ hop, delay: reduced ? 0 : linkDelay(hop), age: reduced ? LINK_EXTEND : 0, hand: hop === 0, reduced,
        fromKey: hop === 0 ? undefined : keys[hop - 1], toKey: keys[hop], from: fromPoint.clone(), to: toPoint.clone(), arrived: false, sinceEnd: 0 });
      started++;
    }
    return started;
  }

  tick(dt: number, time: number): void {
    this.time = time;
    for (let i = this.ropes.length - 1; i >= 0; i--) {
      const rope = this.ropes[i];
      if (rope.delay > 0) { rope.delay -= dt; if (rope.delay > 0) continue; }
      if (!rope.slot) {
        rope.slot = this.acquire();
        if (!rope.slot) { this.ropes.splice(i, 1); continue; }
        rope.slot.mesh.setEnabled(true);
      }
      rope.age += dt;
      if (!rope.arrived && rope.age >= LINK_EXTEND * .9) {
        rope.arrived = true;
        this.bonds.link(rope.toKey, this.endpoint(rope.toKey, rope.to), rope.reduced);
        debug('visual.manhba.link.arrive', { hop: rope.hop, reduced: rope.reduced });
      }
      // Monotonic: once the bond ends the rope keeps withering even after the bond slot is recycled.
      if (rope.arrived && !rope.reduced) rope.sinceEnd = Math.max(rope.sinceEnd, this.sinceBondEnd(rope));
      if (this.finished(rope)) { this.release(rope.slot); this.ropes.splice(i, 1); continue; }
      this.layout(rope);
    }
  }

  clear(): void {
    for (const rope of this.ropes) if (rope.slot) this.release(rope.slot);
    this.ropes.length = 0;
    this.capLogged = false;
  }

  private endpoint(key: string | undefined, fallback: Vector3): Vector3 {
    const live = key === undefined ? undefined : this.bonds.position(key);
    if (live) fallback.copyFrom(live); // remember the last known spot if the bond ends
    return fallback;
  }

  /** Seconds since the bond holding this rope ended (0 while it lasts); a safety cap covers monsters that never get marked. */
  private sinceBondEnd(rope: Rope): number {
    const cap = Math.max(0, rope.age - LINK_EXTEND - BOND_SECONDS);
    const ends = [rope.fromKey, rope.toKey].map(key => (key === undefined ? 0 : this.bonds.sinceEnd(key) ?? cap));
    return Math.max(cap, ...ends);
  }

  private alpha(rope: Rope): number {
    if (rope.hand) return handLinkAlpha(rope.age);
    return linkAlpha(rope.age, rope.reduced ? Math.max(0, rope.age - LINK_EXTEND - .35) : rope.sinceEnd, this.time, rope.reduced);
  }

  private finished(rope: Rope): boolean {
    if (rope.hand) return rope.age >= HAND_LINK_SECONDS;
    if (rope.reduced) return rope.age >= LINK_EXTEND + .35 + BOND_FADE;
    return rope.arrived && rope.sinceEnd >= BOND_FADE;
  }

  private layout(rope: Rope): void {
    const slot = rope.slot;
    if (!slot) return;
    const from = rope.hand ? rope.from : this.endpoint(rope.fromKey, rope.from);
    const to = this.endpoint(rope.toKey, rope.to);
    const dx = to.x - from.x, dz = to.z - from.z;
    const distance = Math.hypot(dx, dz);
    if (distance < .05) { slot.mesh.setEnabled(false); return; }
    slot.mesh.setEnabled(true);
    const dir = { x: dx / distance, z: dz / distance };
    const offset = rope.hand ? Math.min(HAND_OFFSET, distance * .3) : 0;
    const length = distance - offset;
    const reach = Math.max(.02, linkReach(rope.age));
    const shown = length * reach;
    slot.mesh.rotation.y = -Math.atan2(dir.z, dir.x);
    slot.mesh.position.set(from.x + dir.x * (offset + shown / 2), ROPE_HEIGHT, from.z + dir.z * (offset + shown / 2));
    slot.mesh.scaling.set(shown, 1, linkPlaneWidth(length) * linkWidth(rope.age));
    // Right end of the painting (the knot head) always sits at the growing tip.
    slot.texture.uScale = reach;
    slot.texture.uOffset = 1 - reach;
    slot.material.alpha = this.alpha(rope);
  }

  private acquire(): Slot | undefined {
    const pooled = this.free.pop();
    if (pooled) return pooled;
    if (this.created >= MAX_ROPES) {
      if (!this.capLogged) { this.capLogged = true; debug('visual.kit.pool.cap', { pool: 'manhba-rope' }); }
      return undefined;
    }
    const name = `manhba-rope-${this.created++}`;
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
