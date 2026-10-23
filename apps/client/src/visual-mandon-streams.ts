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
import { HEAL_DELAY, HEAL_SECONDS, healFrame, MANDON_ATLAS, PETAL_STREAM_URL, STREAM_EXTEND, STREAM_LIFE, STREAM_START,
  STREAM_STAGGER, streamAlpha, streamPlaneWidth, streamReach, streamWidth } from './visual-mandon-timeline.js';

/** 4 allies per cast, a cast every 10 s per Mẫu Đơn: three overlapping casts is already generous. */
const MAX_STREAMS = 12;
/** Waist height: the strip sits under every actor (ground alpha index) so bodies stay crisp where it crosses. */
const STREAM_HEIGHT = 1.1;
/** Leaves her staff hand, not her centre. */
const HAND_OFFSET = .5;
const HEAL_SCALE = 1;
/** Reduced motion: one still bloom frame and the full strip, briefly, no growth. */
const STILL_HEAL_FRAME = 3;
const STILL_SECONDS = .35;

type Slot = { mesh: Mesh; material: StandardMaterial; texture: Texture };
type Stream = {
  slot?: Slot; delay: number; age: number; from: Vector3; dir: { x: number; z: number }; length: number;
  at: Vector3; heal?: Sprite; struck: boolean; reduced: boolean;
};

/**
 * Petal streams from Mẫu Đơn to each healed ally (the painted mint ribbon of peony petals whose right end is
 * a peony blossom: it grows head first, holds, thins and fades) and the `mandon-heal` blossom on the ally when
 * the head arrives. Allies are the server's `targets`; nothing here decides who is healed.
 */
export class MandonStreams {
  private base: Texture;
  private free: Slot[] = [];
  private created = 0;
  private streams: Stream[] = [];
  private capLogged = false;

  constructor(private scene: Scene, private flipbooks: KitFlipbooks, private petals: KitSpray) {
    this.base = new Texture(PETAL_STREAM_URL, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.kit.asset.ready', { asset: 'mandon-petal-ribbon' }),
      (_message, error) => debug('visual.kit.asset.error', { asset: 'mandon-petal-ribbon', message: String(error ?? 'load failed') }));
    this.base.hasAlpha = true;
    this.base.wrapU = this.base.wrapV = Texture.CLAMP_ADDRESSMODE;
  }

  /** `ability skill-h00F`: `origin` = Mẫu Đơn, `targets` = every recipient (the caster herself gets the bloom only). */
  cast(origin: Vector3, targets: readonly Vector3[], reduced: boolean): number {
    let started = 0;
    targets.forEach((at, index) => {
      const dx = at.x - origin.x, dz = at.z - origin.z;
      const distance = Math.hypot(dx, dz);
      if (distance < .3) { debug('visual.mandon.stream.skip', { reason: 'self' }); return; }
      const dir = { x: dx / distance, z: dz / distance };
      const offset = Math.min(HAND_OFFSET, distance * .3);
      const from = new Vector3(origin.x + dir.x * offset, STREAM_HEIGHT, origin.z + dir.z * offset);
      this.streams.push({ delay: reduced ? 0 : STREAM_START + index * STREAM_STAGGER, age: reduced ? STREAM_EXTEND : 0, from, dir,
        length: distance - offset, at: at.clone(), struck: false, reduced });
      started++;
    });
    return started;
  }

  tick(dt: number): void {
    for (let i = this.streams.length - 1; i >= 0; i--) {
      const stream = this.streams[i];
      if (stream.delay > 0) { stream.delay -= dt; if (stream.delay > 0) continue; }
      if (!stream.slot) {
        stream.slot = this.acquire();
        if (!stream.slot) { this.streams.splice(i, 1); continue; }
        stream.slot.mesh.rotation.y = -Math.atan2(stream.dir.z, stream.dir.x);
        stream.slot.mesh.setEnabled(true);
      }
      stream.age += dt;
      if (!stream.struck && stream.age >= HEAL_DELAY) this.strike(stream);
      if (stream.heal) {
        const healAge = stream.age - HEAL_DELAY;
        if (healAge >= (stream.reduced ? STILL_SECONDS : HEAL_SECONDS)) { this.flipbooks.release(MANDON_ATLAS.heal, stream.heal); stream.heal = undefined; }
        else stream.heal.cellIndex = stream.reduced ? STILL_HEAL_FRAME : healFrame(healAge);
      }
      const life = stream.reduced ? STREAM_EXTEND + STILL_SECONDS : STREAM_LIFE;
      if (stream.age >= life && !stream.heal) { this.release(stream.slot); this.streams.splice(i, 1); continue; }
      this.layout(stream, life);
    }
  }

  clear(): void {
    for (const stream of this.streams) {
      if (stream.heal) this.flipbooks.release(MANDON_ATLAS.heal, stream.heal);
      if (stream.slot) this.release(stream.slot);
    }
    this.streams.length = 0;
    this.capLogged = false;
  }

  private layout(stream: Stream, life: number): void {
    const slot = stream.slot;
    if (!slot) return;
    if (stream.age >= life) { slot.mesh.setEnabled(false); return; }
    const reach = Math.max(.02, streamReach(stream.age));
    const shown = stream.length * reach;
    slot.mesh.position.set(stream.from.x + stream.dir.x * shown / 2, STREAM_HEIGHT, stream.from.z + stream.dir.z * shown / 2);
    slot.mesh.scaling.set(shown, 1, streamPlaneWidth(stream.length) * streamWidth(stream.age));
    // Right end of the painting (the peony head) always sits at the growing tip.
    slot.texture.uScale = reach;
    slot.texture.uOffset = 1 - reach;
    slot.material.alpha = stream.reduced ? streamAlpha(Math.min(stream.age, STREAM_EXTEND)) : streamAlpha(stream.age);
  }

  private strike(stream: Stream): void {
    stream.struck = true;
    stream.heal = this.flipbooks.spawn(MANDON_ATLAS.heal, new Vector3(stream.at.x, 0, stream.at.z), HEAL_SCALE);
    if (!stream.reduced) this.petals.trail(new Vector3(stream.at.x, .7, stream.at.z), new Vector3(0, 1.4, 0), 4);
  }

  private acquire(): Slot | undefined {
    const pooled = this.free.pop();
    if (pooled) return pooled;
    if (this.created >= MAX_STREAMS) {
      if (!this.capLogged) { this.capLogged = true; debug('visual.kit.pool.cap', { pool: 'mandon-stream' }); }
      return undefined;
    }
    const name = `mandon-stream-${this.created++}`;
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
